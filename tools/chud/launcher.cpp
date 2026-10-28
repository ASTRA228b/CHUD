#include "chud/process.hpp"
#include <string>
#include <vector>
#ifndef CHUD_TOOL_SCRIPT
#define CHUD_TOOL_SCRIPT "/tools/chud/chud.mjs"
#endif
int main(int argc, char **argv) {
  std::vector<std::string> args = {"node",
                                   std::string(CHUD_ROOT) + CHUD_TOOL_SCRIPT};
  for (int i = 1; i < argc; ++i)
    args.push_back(argv[i]);
  return chud::runProcess(args);
}
