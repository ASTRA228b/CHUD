#pragma once
#include <cstdint>
#include <memory>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <vector>

namespace chud {
struct Span {
  std::string file;
  int line = 1;
  int column = 1;
  int length = 1;
};
struct Diagnostic {
  Span span;
  std::string message;
};
struct Failure : std::runtime_error {
  Span span;
  Failure(Span s, std::string message)
      : std::runtime_error(message), span(std::move(s)) {}
};
struct Token {
  std::string kind, text;
  Span span;
};
std::vector<Token> lex(const std::string &source, const std::string &file);
enum class Type { Int, Bool, String, Void };
std::string typeName(Type type);
struct Expr {
  enum Kind { Integer, Boolean, String, Name, Unary, Binary, Call } kind;
  Token token;
  std::string value;
  std::vector<std::unique_ptr<Expr>> args;
};
struct Stmt {
  enum Kind {
    Binding,
    Assign,
    Expression,
    Return,
    Block,
    If,
    While,
    Loop,
    Break,
    Continue,
    For
  } kind;
  Token token;
  std::string name, op;
  bool mutableBinding = false;
  bool hasAnnotation = false;
  Type annotation = Type::Void;
  std::unique_ptr<Expr> expr, extra;
  std::vector<std::unique_ptr<Stmt>> body, alternative;
};
struct Parameter {
  Token token;
  Type type;
};
struct Function {
  Token token;
  bool isPublic = false;
  bool topLevel = false;
  std::vector<Parameter> params;
  Type result = Type::Void;
  std::vector<std::unique_ptr<Stmt>> body;
};
struct Program {
  std::vector<Function> functions;
};
Program parse(const std::vector<Token> &tokens,
              std::vector<Diagnostic> &errors);
std::string generate(const Program &program, bool requireMain);
} // namespace chud
