#include "chud/builtins.hpp"
#include "chud/frontend.hpp"
#include <algorithm>

namespace chud {
namespace {
class Parser {
  const std::vector<Token> &tokens;
  size_t pos = 0;
  const Token &peek() const { return tokens[pos]; }
  bool at(const std::string &k) const { return peek().kind == k; }
  Token take() { return tokens[pos++]; }
  bool eat(const std::string &k) {
    if (!at(k))
      return false;
    take();
    return true;
  }
  Token expect(const std::string &k) {
    if (!at(k))
      throw Failure(peek().span,
                    "Expected '" + k + "', found '" + peek().kind + "'");
    return take();
  }
  Type type(bool allowVoid = false) {
    auto t = expect("identifier");
    if (t.text == "int")
      return Type::Int;
    if (t.text == "bool")
      return Type::Bool;
    if (t.text == "string")
      return Type::String;
    if (t.text == "list")
      return Type::List;
    if (allowVoid && t.text == "void")
      return Type::Void;
    throw Failure(t.span, "Unsupported type '" + t.text + "' in this alpha");
  }
  std::unique_ptr<Expr> expression(int minPrec = 0) {
    auto t = take();
    auto e = std::make_unique<Expr>();
    e->token = t;
    e->value = t.text;
    if (t.kind == "integer")
      e->kind = Expr::Integer;
    else if (t.kind == "string")
      e->kind = Expr::String;
    else if (t.kind == "true" || t.kind == "false")
      e->kind = Expr::Boolean;
    else if (t.kind == "identifier") {
      e->kind = Expr::Name;
      while (eat("."))
        e->value += "." + expect("identifier").text;
      if (eat("(")) {
        e->kind = Expr::Call;
        if (!at(")")) {
          do {
            e->args.push_back(expression());
          } while (eat(","));
        }
        expect(")");
      }
    } else if (t.kind == "-" || t.kind == "!") {
      e->kind = Expr::Unary;
      e->args.push_back(expression(7));
    } else if (t.kind == "(") {
      e = expression();
      expect(")");
    } else
      throw Failure(t.span, "Expected expression, found '" + t.kind + "'");
    static const std::unordered_map<std::string, int> precedence = {
        {"||", 1}, {"&&", 2}, {"==", 3}, {"!=", 3}, {"<", 4},
        {">", 4},  {"<=", 4}, {">=", 4}, {"+", 5},  {"-", 5},
        {"*", 6},  {"/", 6},  {"%", 6}};
    while (true) {
      auto found = precedence.find(peek().kind);
      if (found == precedence.end() || found->second < minPrec)
        break;
      auto op = take();
      auto b = std::make_unique<Expr>();
      b->kind = Expr::Binary;
      b->token = op;
      b->value = op.text;
      b->args.push_back(std::move(e));
      b->args.push_back(expression(found->second + 1));
      e = std::move(b);
    }
    return e;
  }
  std::vector<std::unique_ptr<Stmt>> block() {
    expect("{");
    std::vector<std::unique_ptr<Stmt>> b;
    while (!at("}") && !at("eof"))
      b.push_back(statement());
    expect("}");
    return b;
  }
  std::unique_ptr<Stmt> statement() {
    auto s = std::make_unique<Stmt>();
    s->token = peek();
    if (at("let") || at("mut") || at("const")) {
      auto k = take();
      s->kind = Stmt::Binding;
      s->mutableBinding = k.kind == "mut";
      s->name = expect("identifier").text;
      if (eat(":")) {
        s->hasAnnotation = true;
        s->annotation = type();
      }
      expect("=");
      s->expr = expression();
      expect(";");
      return s;
    }
    if (eat("return")) {
      s->kind = Stmt::Return;
      if (!at(";"))
        s->expr = expression();
      expect(";");
      return s;
    }
    if (eat("if")) {
      s->kind = Stmt::If;
      s->expr = expression();
      s->body = block();
      if (eat("else")) {
        if (at("if"))
          s->alternative.push_back(statement());
        else
          s->alternative = block();
      }
      return s;
    }
    if (eat("while")) {
      s->kind = Stmt::While;
      s->expr = expression();
      s->body = block();
      return s;
    }
    if (eat("loop")) {
      s->kind = Stmt::Loop;
      s->body = block();
      return s;
    }
    if (eat("for")) {
      s->kind = Stmt::For;
      s->name = expect("identifier").text;
      expect("in");
      s->expr = expression();
      expect("..");
      s->extra = expression();
      s->body = block();
      return s;
    }
    if (eat("break")) {
      s->kind = Stmt::Break;
      expect(";");
      return s;
    }
    if (eat("continue")) {
      s->kind = Stmt::Continue;
      expect(";");
      return s;
    }
    if (at("{")) {
      s->kind = Stmt::Block;
      s->body = block();
      return s;
    }
    if (at("identifier") && pos + 1 < tokens.size() &&
        (tokens[pos + 1].kind == "=" || tokens[pos + 1].kind == "+=" ||
         tokens[pos + 1].kind == "-=" || tokens[pos + 1].kind == "*=" ||
         tokens[pos + 1].kind == "/=")) {
      s->kind = Stmt::Assign;
      s->name = take().text;
      s->op = take().text;
      s->expr = expression();
      expect(";");
      return s;
    }
    s->kind = Stmt::Expression;
    s->expr = expression();
    expect(";");
    return s;
  }
  Function function(bool pub) {
    expect("func");
    Function f;
    f.isPublic = pub;
    f.token = expect("identifier");
    expect("(");
    if (!at(")")) {
      do {
        auto p = expect("identifier");
        expect(":");
        f.params.push_back({p, type()});
      } while (eat(","));
    }
    expect(")");
    expect("->");
    f.result = type(true);
    f.body = block();
    return f;
  }

public:
  explicit Parser(const std::vector<Token> &t) : tokens(t) {}
  Program run(std::vector<Diagnostic> &errors) {
    Program p;
    std::vector<std::unique_ptr<Stmt>> top;
    while (!at("eof")) {
      const size_t before = pos;
      try {
        if (eat("chud") || eat("use")) {
          auto name = expect("identifier").text;
          while (eat("."))
            name += "." + expect("identifier").text;
          expect(";");
          if (tokens[before].kind == "use" && !libraryAvailable(name))
            throw Failure(tokens[before].span, "Unknown library '" + name +
                                                   "'. See docs/LIBRARIES.md");
        } else if (at("public") || at("func")) {
          bool pub = eat("public");
          p.functions.push_back(function(pub));
        } else
          top.push_back(statement());
      } catch (const Failure &e) {
        errors.push_back({e.span, e.what()});
        if (pos >= tokens.size())
          pos = tokens.size() - 1;
        while (!at("eof") && !at("func") && !at("public"))
          take();
        if (pos == before && !at("eof"))
          take();
      }
    }
    if (!top.empty()) {
      Function f;
      f.token = {"identifier", "Main", tokens.front().span};
      f.isPublic = true;
      f.topLevel = true;
      f.result = Type::Int;
      f.body = std::move(top);
      p.functions.push_back(std::move(f));
    }
    return p;
  }
};
} // namespace
Program parse(const std::vector<Token> &tokens,
              std::vector<Diagnostic> &errors) {
  return Parser(tokens).run(errors);
}
} // namespace chud
