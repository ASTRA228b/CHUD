#include "chud/frontend.hpp"
#include <iomanip>
#include <limits>
#include <sstream>

namespace chud {
namespace {
std::string llvmType(Type t) {
  switch (t) {
  case Type::Int:
    return "i32";
  case Type::Bool:
    return "i1";
  case Type::String:
    return "ptr";
  default:
    return "void";
  }
}
struct Value {
  Type type;
  std::string ir;
};
struct Symbol {
  Type type;
  std::string address;
  bool mutableBinding;
};
class Generator {
  const Program &program;
  std::unordered_map<std::string, const Function *> functions;
  std::vector<std::unordered_map<std::string, Symbol>> scopes;
  std::vector<std::pair<std::string, std::string>> loops;
  std::ostringstream globals, output, body, allocas;
  int next = 0, strings = 0;
  std::string current;
  bool terminated = false;
  Type returnType = Type::Void;
  std::string temp() { return "%v" + std::to_string(next++); }
  std::string label() { return "b" + std::to_string(next++); }
  void emit(const std::string &s) { body << "  " << s << '\n'; }
  void block(const std::string &s) {
    body << s << ":\n";
    current = s;
    terminated = false;
  }
  void branch(const std::string &s) {
    emit("br label %" + s);
    terminated = true;
  }
  void require(Type actual, Type expected, const Token &t) {
    if (actual != expected)
      throw Failure(t.span, "Expected " + typeName(expected) + ", got " +
                                typeName(actual));
  }
  Symbol lookup(const std::string &name, const Token &t) {
    for (auto i = scopes.rbegin(); i != scopes.rend(); ++i)
      if (i->contains(name))
        return i->at(name);
    throw Failure(t.span, "Unknown binding '" + name + "'");
  }
  Symbol declare(const std::string &name, Type type, bool mut, const Token &t) {
    if (type == Type::Void)
      throw Failure(t.span, "A binding cannot have type void");
    if (scopes.back().contains(name))
      throw Failure(t.span, "Duplicate binding '" + name + "'");
    Symbol s{type, temp(), mut};
    allocas << "  " << s.address << " = alloca " << llvmType(type) << '\n';
    scopes.back()[name] = s;
    return s;
  }
  Value load(const Symbol &s) {
    auto v = temp();
    emit(v + " = load " + llvmType(s.type) + ", ptr " + s.address);
    return {s.type, v};
  }
  void store(const Symbol &s, const Value &v) {
    emit("store " + llvmType(s.type) + " " + v.ir + ", ptr " + s.address);
  }
  Value binary(const std::string &op, Value a, Value b, const Token &t) {
    require(b.type, a.type, t);
    auto v = temp();
    if (op == "==" || op == "!=") {
      if (a.type == Type::Void)
        throw Failure(t.span, "Cannot compare void values");
      if (a.type == Type::String) {
        auto raw = temp();
        emit(raw + " = call i32 @chud_streq(ptr " + a.ir + ", ptr " + b.ir +
             ")");
        emit(v + " = icmp " + (op == "==" ? "ne" : "eq") + " i32 " + raw +
             ", 0");
      } else
        emit(v + " = icmp " + (op == "==" ? "eq" : "ne") + " " +
             llvmType(a.type) + " " + a.ir + ", " + b.ir);
      return {Type::Bool, v};
    }
    require(a.type, Type::Int, t);
    static const std::unordered_map<std::string, std::string> operators = {
        {"+", "add"},      {"-", "sub"},      {"*", "mul"},
        {"<", "icmp slt"}, {">", "icmp sgt"}, {"<=", "icmp sle"},
        {">=", "icmp sge"}};
    if (op == "/" || op == "%")
      emit(v + " = call i32 @chud_" + (op == "/" ? "div" : "mod") + "(i32 " +
           a.ir + ", i32 " + b.ir + ")");
    else
      emit(v + " = " + operators.at(op) + " i32 " + a.ir + ", " + b.ir);
    return {(op == "<" || op == ">" || op == "<=" || op == ">=") ? Type::Bool
                                                                 : Type::Int,
            v};
  }
  Value expr(const Expr &e) {
    switch (e.kind) {
    case Expr::Integer: {
      try {
        auto n = std::stoll(e.value);
        if (n > INT32_MAX)
          throw std::out_of_range("int");
      } catch (...) {
        throw Failure(e.token.span, "Integer literal is outside the int range");
      }
      return {Type::Int, e.value};
    }
    case Expr::Boolean:
      return {Type::Bool, e.value == "true" ? "1" : "0"};
    case Expr::String: {
      auto name = "@str" + std::to_string(strings++);
      std::ostringstream escaped;
      for (unsigned char c : e.value)
        escaped << '\\' << std::uppercase << std::hex << std::setw(2)
                << std::setfill('0') << static_cast<int>(c);
      globals << name << " = private unnamed_addr constant ["
              << e.value.size() + 1 << " x i8] c\"" << escaped.str()
              << "\\00\"\n";
      return {Type::String, name};
    }
    case Expr::Name:
      return load(lookup(e.value, e.token));
    case Expr::Unary: {
      if (e.value == "-" && e.args[0]->kind == Expr::Integer &&
          e.args[0]->value == "2147483648")
        return {Type::Int, "-2147483648"};
      auto a = expr(*e.args[0]);
      auto v = temp();
      require(a.type, e.value == "!" ? Type::Bool : Type::Int, e.token);
      emit(v + (e.value == "!" ? " = xor i1 " + a.ir + ", true"
                               : " = sub i32 0, " + a.ir));
      return {a.type, v};
    }
    case Expr::Binary: {
      auto a = expr(*e.args[0]);
      if (e.value == "&&" || e.value == "||") {
        require(a.type, Type::Bool, e.token);
        auto from = current, rhs = label(), end = label();
        emit("br i1 " + a.ir + ", label %" + (e.value == "&&" ? rhs : end) +
             ", label %" + (e.value == "&&" ? end : rhs));
        block(rhs);
        auto b = expr(*e.args[1]);
        require(b.type, Type::Bool, e.token);
        auto rhsEnd = current;
        branch(end);
        block(end);
        auto v = temp();
        emit(v + " = phi i1 [ " + (e.value == "&&" ? "0" : "1") + ", %" + from +
             " ], [ " + b.ir + ", %" + rhsEnd + " ]");
        return {Type::Bool, v};
      }
      auto b = expr(*e.args[1]);
      return binary(e.value, a, b, e.token);
    }
    case Expr::Call: {
      if (e.value == "CHUD.Print" || e.value == "CHUD.Warn" ||
          e.value == "CHUD.Error") {
        if (e.args.size() != 1)
          throw Failure(e.token.span, e.value + " requires one argument");
        auto a = expr(*e.args[0]);
        if (a.type == Type::Void)
          throw Failure(e.token.span, "Cannot print void");
        int channel = e.value == "CHUD.Print" ? 0 : 1;
        if (a.type == Type::Bool) {
          auto v = temp();
          emit(v + " = zext i1 " + a.ir + " to i32");
          a.ir = v;
        }
        emit("call void @chud_print_" + typeName(a.type) + "(" +
             (a.type == Type::String ? "ptr " : "i32 ") + a.ir + ", i32 " +
             std::to_string(channel) + ")");
        return {Type::Void, ""};
      }
      if (!functions.contains(e.value))
        throw Failure(e.token.span, "Unknown function '" + e.value + "'");
      if (e.value == "Main")
        throw Failure(e.token.span, "Main cannot be called directly");
      const auto &f = *functions.at(e.value);
      if (e.args.size() != f.params.size())
        throw Failure(e.token.span,
                      "Wrong argument count for '" + e.value + "'");
      std::string args;
      for (size_t i = 0; i < e.args.size(); ++i) {
        auto a = expr(*e.args[i]);
        require(a.type, f.params[i].type, e.args[i]->token);
        if (i)
          args += ", ";
        args += llvmType(a.type) + " " + a.ir;
      }
      auto v = f.result == Type::Void ? "" : temp();
      emit((v.empty() ? "" : v + " = ") + "call " + llvmType(f.result) +
           " @chud_fn_" + e.value + "(" + args + ")");
      return {f.result, v};
    }
    }
    throw Failure(e.token.span, "Unsupported expression");
  }
  void statements(const std::vector<std::unique_ptr<Stmt>> &list,
                  bool scoped = true) {
    if (scoped)
      scopes.emplace_back();
    for (const auto &s : list) {
      if (terminated)
        throw Failure(s->token.span, "Unreachable statement");
      stmt(*s);
    }
    if (scoped)
      scopes.pop_back();
  }
  void stmt(const Stmt &s) {
    switch (s.kind) {
    case Stmt::Binding: {
      if (s.token.kind == "const" && s.expr->kind != Expr::Integer &&
          s.expr->kind != Expr::Boolean && s.expr->kind != Expr::String &&
          !(s.expr->kind == Expr::Unary && s.expr->value == "-" &&
            s.expr->args[0]->kind == Expr::Integer))
        throw Failure(s.token.span,
                      "Alpha const initializers must be literal values");
      auto a = expr(*s.expr);
      if (s.hasAnnotation)
        require(a.type, s.annotation, s.token);
      store(declare(s.name, a.type, s.mutableBinding, s.token), a);
      return;
    }
    case Stmt::Assign: {
      auto sym = lookup(s.name, s.token);
      if (!sym.mutableBinding)
        throw Failure(s.token.span,
                      "Cannot assign to immutable binding '" + s.name + "'");
      auto a = expr(*s.expr);
      require(a.type, sym.type, s.token);
      if (s.op != "=")
        a = binary(s.op.substr(0, 1), load(sym), a, s.token);
      store(sym, a);
      return;
    }
    case Stmt::Expression:
      expr(*s.expr);
      return;
    case Stmt::Return: {
      auto a = s.expr ? expr(*s.expr) : Value{Type::Void, ""};
      require(a.type, returnType, s.token);
      emit("ret " + llvmType(a.type) + (a.ir.empty() ? "" : " " + a.ir));
      terminated = true;
      return;
    }
    case Stmt::Block:
      statements(s.body);
      return;
    case Stmt::If: {
      auto a = expr(*s.expr);
      require(a.type, Type::Bool, s.token);
      auto yes = label(), no = label(), end = label();
      emit("br i1 " + a.ir + ", label %" + yes + ", label %" + no);
      block(yes);
      statements(s.body);
      bool yesReturn = terminated;
      if (!terminated)
        branch(end);
      block(no);
      statements(s.alternative);
      bool noReturn = terminated;
      if (!terminated)
        branch(end);
      if (yesReturn && noReturn)
        terminated = true;
      else
        block(end);
      return;
    }
    case Stmt::While:
    case Stmt::Loop:
    case Stmt::For: {
      scopes.emplace_back();
      Symbol index{};
      Value limit{};
      if (s.kind == Stmt::For) {
        auto start = expr(*s.expr);
        limit = expr(*s.extra);
        require(start.type, Type::Int, s.token);
        require(limit.type, Type::Int, s.token);
        index = declare(s.name, Type::Int, false, s.token);
        store(index, start);
      }
      auto test = label(), work = label(), increment = label(), end = label();
      branch(test);
      block(test);
      if (s.kind == Stmt::Loop)
        branch(work);
      else {
        auto condition = s.kind == Stmt::For
                             ? binary("<", load(index), limit, s.token)
                             : expr(*s.expr);
        require(condition.type, Type::Bool, s.token);
        emit("br i1 " + condition.ir + ", label %" + work + ", label %" + end);
      }
      block(work);
      loops.emplace_back(end, s.kind == Stmt::For ? increment : test);
      statements(s.body);
      loops.pop_back();
      if (!terminated)
        branch(s.kind == Stmt::For ? increment : test);
      if (s.kind == Stmt::For) {
        block(increment);
        store(index, binary("+", load(index), {Type::Int, "1"}, s.token));
        branch(test);
      }
      block(end);
      scopes.pop_back();
      return;
    }
    case Stmt::Break:
    case Stmt::Continue:
      if (loops.empty())
        throw Failure(s.token.span, "Loop control outside a loop");
      branch(s.kind == Stmt::Break ? loops.back().first : loops.back().second);
      return;
    }
  }

public:
  explicit Generator(const Program &p) : program(p) {}
  std::string run(bool requireMain) {
    for (const auto &f : program.functions) {
      if (functions.contains(f.token.text))
        throw Failure(f.token.span,
                      "Duplicate function '" + f.token.text + "'");
      functions[f.token.text] = &f;
    }
    if (requireMain && !functions.contains("Main"))
      throw Failure({"<project>", 1, 1},
                    "Executable requires public func Main() -> int");
    for (const auto &f : program.functions) {
      if (f.token.text == "Main" &&
          (!f.isPublic || !f.params.empty() || f.result != Type::Int))
        throw Failure(f.token.span,
                      "Entry point must be public func Main() -> int");
      body.str("");
      body.clear();
      allocas.str("");
      allocas.clear();
      scopes.clear();
      loops.clear();
      next = 0;
      scopes.emplace_back();
      current = "entry";
      terminated = false;
      returnType = f.result;
      std::string params;
      for (size_t i = 0; i < f.params.size(); ++i) {
        if (i)
          params += ", ";
        const auto &p = f.params[i];
        auto arg = "%arg" + std::to_string(i);
        params += llvmType(p.type) + " " + arg;
        store(declare(p.token.text, p.type, false, p.token), {p.type, arg});
      }
      statements(f.body, false);
      if (!terminated) {
        if (f.result == Type::Void)
          emit("ret void");
        else if (f.topLevel)
          emit("ret i32 0");
        else
          throw Failure(f.token.span, "Function '" + f.token.text +
                                          "' may finish without returning " +
                                          typeName(f.result));
      }
      output << "define " << llvmType(f.result) << " @"
             << (f.token.text == "Main" ? "main" : "chud_fn_" + f.token.text)
             << "(" << params << ") {\nentry:\n"
             << allocas.str() << body.str() << "}\n";
    }
    return "; CHUD generated LLVM IR\n" + globals.str() +
           "declare void @chud_print_string(ptr, i32)\ndeclare void "
           "@chud_print_int(i32, i32)\ndeclare void @chud_print_bool(i32, "
           "i32)\ndeclare i32 @chud_div(i32, i32)\ndeclare i32 @chud_mod(i32, "
           "i32)\ndeclare i32 @chud_streq(ptr, ptr)\n" +
           output.str();
  }
};
} // namespace
std::string generate(const Program &p, bool requireMain) {
  return Generator(p).run(requireMain);
}
} // namespace chud
