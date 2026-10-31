#pragma once
#include "chud/frontend.hpp"

namespace chud {
struct Builtin {
  std::string name, symbol;
  Type result;
  std::vector<Type> params;
};
inline const std::vector<Builtin> &builtins() {
  static const std::vector<Builtin> entries = {
#define CHUD_BUILTIN(name, symbol, result, ...)                                \
  {name, #symbol, Type::result, {__VA_ARGS__}},
#include "../../../runtime/builtins.def"
#undef CHUD_BUILTIN
  };
  return entries;
}
inline bool libraryAvailable(const std::string &name) {
  if (name == "CHUD.Core")
    return true;
  for (const auto &b : builtins())
    if (b.name.substr(0, b.name.rfind('.')) == name)
      return true;
  return false;
}
} // namespace chud
