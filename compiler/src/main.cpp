#include "chud/frontend.hpp"
#include "chud/process.hpp"
#include <algorithm>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <sstream>
namespace fs = std::filesystem;
static std::string json(const std::string &s) {
  std::string out = "\"";
  for (unsigned char c : s) {
    if (c == '\\' || c == '"') {
      out += '\\';
      out += c;
    } else if (c == '\n')
      out += "\\n";
    else if (c == '\r')
      out += "\\r";
    else if (c == '\t')
      out += "\\t";
    else if (c < 32)
      out += '?';
    else
      out += c;
  }
  return out + '"';
}
int main(int argc, char **argv) {
  std::vector<std::string> files;
  fs::path output = "program.exe";
  bool check = false, jsonErrors = false, library = false, release = false,
       emitIR = false, symbols = false;
  std::vector<chud::Diagnostic> errors;
  try {
    for (int i = 1; i < argc; ++i) {
      std::string a = argv[i];
      if (a == "--version") {
        std::cout << "CHUD Compiler 0.1.0-alpha\n";
        return 0;
      }
      if (a == "--help") {
        std::cout << "CHUD Compiler\nchudc <files.chud> [-o program.exe] "
                     "[--check] [--release] [--emit-ir] [--diagnostics-json] "
                     "[--library] [--symbols-json]\n";
        return 0;
      }
      if (a == "--check")
        check = true;
      else if (a == "--diagnostics-json")
        jsonErrors = true;
      else if (a == "--symbols-json")
        symbols = true;
      else if (a == "--library")
        library = true;
      else if (a == "--release")
        release = true;
      else if (a == "--emit-ir")
        emitIR = true;
      else if (a == "-o" && i + 1 < argc)
        output = fs::u8path(argv[++i]);
      else if (a.starts_with("-"))
        throw std::runtime_error("Unknown option: " + a);
      else
        files.push_back(a);
    }
    if (files.empty())
      throw std::runtime_error("No .chud source files supplied");
    chud::Program program;
    for (const auto &file : files) {
      auto path = fs::u8path(file);
      auto ext = path.extension().string();
      std::transform(ext.begin(), ext.end(), ext.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
      });
      if (ext != ".chud")
        throw std::runtime_error("Expected .chud or .CHUD source: " + file);
      std::ifstream stream(path, std::ios::binary);
      if (!stream)
        throw std::runtime_error("Cannot read source: " + file);
      std::ostringstream source;
      source << stream.rdbuf();
      auto text = source.str();
      if (text.starts_with("\xEF\xBB\xBF"))
        text.erase(0, 3);
      try {
        auto tokens = chud::lex(text, file);
        auto p = chud::parse(tokens, errors);
        for (auto &f : p.functions)
          program.functions.push_back(std::move(f));
      } catch (const chud::Failure &e) {
        errors.push_back({e.span, e.what()});
      }
    }
    std::string ir;
    if (symbols && errors.empty()) {
      std::cout << '[';
      bool first = true;
      for (const auto &f : program.functions) {
        if (f.topLevel)
          continue;
        if (!first)
          std::cout << ',';
        first = false;
        std::cout << "{\"name\":" << json(f.token.text)
                  << ",\"type\":" << json(chud::typeName(f.result))
                  << ",\"file\":" << json(f.token.span.file)
                  << ",\"line\":" << f.token.span.line
                  << ",\"column\":" << f.token.span.column
                  << ",\"length\":" << f.token.span.length << '}';
      }
      std::cout << "]\n";
      return 0;
    }
    if (errors.empty())
      try {
        ir = chud::generate(program, !library);
      } catch (const chud::Failure &e) {
        errors.push_back({e.span, e.what()});
      }
    if (jsonErrors) {
      std::cout << '[';
      for (size_t i = 0; i < errors.size(); ++i) {
        auto &e = errors[i];
        if (i)
          std::cout << ',';
        std::cout << "{\"file\":" << json(e.span.file)
                  << ",\"line\":" << e.span.line
                  << ",\"column\":" << e.span.column
                  << ",\"length\":" << e.span.length
                  << ",\"message\":" << json(e.message) << '}';
      }
      std::cout << "]\n";
    } else
      for (const auto &e : errors)
        std::cerr << e.span.file << ':' << e.span.line << ':' << e.span.column
                  << ": error: " << e.message << '\n';
    if (!errors.empty())
      return 1;
    if (check)
      return 0;
    if (library)
      throw std::runtime_error("Library object emission is not available yet; "
                               "--library is for checking only");
    if (output.has_parent_path())
      fs::create_directories(output.parent_path());
    auto irPath = output;
    irPath.replace_extension(".ll");
    std::ofstream(irPath, std::ios::binary) << ir;
    if (emitIR)
      return 0;
    std::string clang = "clang";
    if (auto value = std::getenv("CHUD_CLANG"))
      clang = value;
    else if (fs::exists(fs::path(CHUD_ROOT) / ".tools/llvm/bin/clang.exe"))
      clang = (fs::path(CHUD_ROOT) / ".tools/llvm/bin/clang.exe").string();
    auto object = output;
    object.replace_extension(".obj");
    auto code = chud::runProcess({clang, "-Wno-override-module",
                                  release ? "-O2" : "-O0", "-c",
                                  irPath.string(), "-o", object.string()});
    if (code)
      return code;
    code = chud::runProcess(
        {clang, object.string(),
         (fs::path(CHUD_ROOT) / "runtime/src/core.c").string(),
         (fs::path(CHUD_ROOT) / "runtime/src/libraries.c").string(),
         (fs::path(CHUD_ROOT) / "runtime/src/gui.c").string(), "-luser32",
         "-lgdi32", "-o", output.string()});
    return code;
  } catch (const std::exception &e) {
    std::cerr << "CHUD Compiler: " << e.what() << '\n';
    return 1;
  }
}
