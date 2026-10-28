#include "chud/process.hpp"
#include <iostream>
#ifdef _WIN32
#include <windows.h>
#else
#include <sys/wait.h>
#include <unistd.h>
#endif
namespace chud {
int runProcess(const std::vector<std::string> &args) {
#ifdef _WIN32
  auto widen = [](const std::string &s) {
    int n = MultiByteToWideChar(CP_UTF8, 0, s.data(),
                                static_cast<int>(s.size()), nullptr, 0);
    std::wstring w(n, L' ');
    MultiByteToWideChar(CP_UTF8, 0, s.data(), static_cast<int>(s.size()),
                        w.data(), n);
    return w;
  };
  std::wstring command;
  for (const auto &arg : args) {
    if (!command.empty())
      command += L' ';
    command += L'"';
    size_t slashes = 0;
    for (wchar_t c : widen(arg)) {
      if (c == L'\\') {
        ++slashes;
        continue;
      }
      if (c == L'"')
        command.append(slashes * 2 + 1, L'\\');
      else
        command.append(slashes, L'\\');
      slashes = 0;
      command += c;
    }
    command.append(slashes * 2, L'\\');
    command += L'"';
  }
  STARTUPINFOW si{};
  si.cb = sizeof(si);
  PROCESS_INFORMATION pi{};
  if (!CreateProcessW(nullptr, command.data(), nullptr, nullptr, TRUE, 0,
                      nullptr, nullptr, &si, &pi)) {
    std::cerr << "Could not start native tool (Windows error " << GetLastError()
              << ")\n";
    return 1;
  }
  WaitForSingleObject(pi.hProcess, INFINITE);
  DWORD code;
  GetExitCodeProcess(pi.hProcess, &code);
  CloseHandle(pi.hProcess);
  CloseHandle(pi.hThread);
  return static_cast<int>(code);
#else
  std::vector<char *> argv;
  for (const auto &a : args)
    argv.push_back(const_cast<char *>(a.c_str()));
  argv.push_back(nullptr);
  auto pid = fork();
  if (pid < 0)
    return 1;
  if (pid == 0) {
    execvp(argv[0], argv.data());
    _exit(127);
  }
  int status;
  waitpid(pid, &status, 0);
  return WIFEXITED(status) ? WEXITSTATUS(status) : 1;
#endif
}
} // namespace chud
