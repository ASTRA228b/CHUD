#include "chud/frontend.hpp"
#include <cctype>
#include <unordered_set>

namespace chud {
std::vector<Token> lex(const std::string &s, const std::string &file) {
  // Validate UTF-8 first; spans use UTF-16 columns, matching editor/LSP
  // positions.
  int utfLine = 1, utfColumn = 1;
  for (size_t p = 0; p < s.size();) {
    const auto lead = static_cast<unsigned char>(s[p]);
    if (lead < 0x80) {
      if (lead == '\n') {
        ++utfLine;
        utfColumn = 1;
      } else
        ++utfColumn;
      ++p;
      continue;
    }
    int length = lead >= 0xC2 && lead <= 0xDF   ? 2
                 : lead >= 0xE0 && lead <= 0xEF ? 3
                 : lead >= 0xF0 && lead <= 0xF4 ? 4
                                                : 0;
    uint32_t value = length ? lead & ((1u << (7 - length)) - 1) : 0;
    bool valid = length != 0 && p + length <= s.size();
    for (int j = 1; valid && j < length; ++j) {
      auto b = static_cast<unsigned char>(s[p + j]);
      if ((b & 0xC0) != 0x80)
        valid = false;
      else
        value = (value << 6) | (b & 0x3F);
    }
    if (!valid || (length == 3 && value < 0x800) ||
        (length == 4 && value < 0x10000) || value > 0x10FFFF ||
        (value >= 0xD800 && value <= 0xDFFF))
      throw Failure({file, utfLine, utfColumn}, "Source is not valid UTF-8");
    p += length;
    utfColumn += length == 4 ? 2 : 1;
  }
  std::vector<Token> out;
  size_t i = 0;
  int line = 1, col = 1;
  auto advance = [&]() {
    char c = s[i++];
    auto b = static_cast<unsigned char>(c);
    if (c == '\n') {
      ++line;
      col = 1;
    } else if (b < 0x80 || b >= 0xC0)
      col += b >= 0xF0 ? 2 : 1;
    return c;
  };
  auto fail = [&](const std::string &msg) {
    throw Failure({file, line, col}, msg);
  };
  static const std::unordered_set<std::string> keywords = {
      "chud",    "use",     "func",     "let",    "mut",    "const",
      "public",  "private", "internal", "static", "if",     "else",
      "for",     "in",      "while",    "loop",   "break",  "continue",
      "return",  "true",    "false",    "type",   "struct", "trait",
      "impl",    "enum",    "new",      "self",   "match",  "case",
      "default", "null",    "async",    "await",  "defer",  "unsafe"};
  while (i < s.size()) {
    unsigned char c = static_cast<unsigned char>(s[i]);
    if (std::isspace(c)) {
      advance();
      continue;
    }
    if (s.compare(i, 2, "//") == 0) {
      while (i < s.size() && s[i] != '\n')
        advance();
      continue;
    }
    if (s.compare(i, 2, "/*") == 0) {
      advance();
      advance();
      while (i < s.size() && s.compare(i, 2, "*/") != 0)
        advance();
      if (i == s.size())
        fail("Unterminated block comment");
      advance();
      advance();
      continue;
    }
    Span span{file, line, col};
    size_t start = i;
    if (std::isalpha(c) || c == '_') {
      while (i < s.size() &&
             (std::isalnum(static_cast<unsigned char>(s[i])) || s[i] == '_'))
        advance();
      auto word = s.substr(start, i - start);
      span.length = static_cast<int>(i - start);
      out.push_back(
          {keywords.contains(word) ? word : "identifier", word, span});
      continue;
    }
    if (std::isdigit(c)) {
      while (i < s.size() && std::isdigit(static_cast<unsigned char>(s[i])))
        advance();
      span.length = static_cast<int>(i - start);
      out.push_back({"integer", s.substr(start, i - start), span});
      continue;
    }
    if (c == '"') {
      advance();
      std::string value;
      while (i < s.size() && s[i] != '"') {
        char v = advance();
        if (v == '\n' || v == '\r')
          fail("Newline in string literal");
        if (v == '\\') {
          if (i == s.size())
            fail("Unterminated string escape");
          switch (advance()) {
          case 'n':
            v = '\n';
            break;
          case 'r':
            v = '\r';
            break;
          case 't':
            v = '\t';
            break;
          case '"':
            v = '"';
            break;
          case '\\':
            v = '\\';
            break;
          default:
            fail("Unsupported string escape");
          }
        }
        if (v == 0)
          fail("NUL is not permitted in strings");
        value += v;
      }
      if (i == s.size())
        fail("Unterminated string literal");
      advance();
      span.length = col - span.column;
      out.push_back({"string", value, span});
      continue;
    }
    std::string two = s.substr(i, 2);
    static const std::unordered_set<std::string> pairs = {
        "->", "==", "!=", "<=", ">=", "&&", "||", "+=", "-=", "*=", "/=", ".."};
    if (pairs.contains(two)) {
      advance();
      advance();
      span.length = 2;
      out.push_back({two, two, span});
      continue;
    }
    if (std::string("{}();,:.+-*/%!=<>").find(static_cast<char>(c)) !=
        std::string::npos) {
      std::string v(1, advance());
      out.push_back({v, v, span});
      continue;
    }
    fail("Unexpected byte in source (identifiers use ASCII)");
  }
  out.push_back({"eof", "", {file, line, col}});
  return out;
}
std::string typeName(Type t) {
  switch (t) {
  case Type::Int:
    return "int";
  case Type::Bool:
    return "bool";
  case Type::String:
    return "string";
  default:
    return "void";
  }
}
} // namespace chud
