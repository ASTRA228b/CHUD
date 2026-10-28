#include <limits.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void chud_print_string(const char *value, int channel) {
  fprintf(channel ? stderr : stdout, "%s\n", value);
}
void chud_print_int(int32_t value, int channel) {
  fprintf(channel ? stderr : stdout, "%d\n", (int)value);
}
void chud_print_bool(int value, int channel) {
  chud_print_string(value ? "true" : "false", channel);
}
int chud_streq(const char *a, const char *b) { return strcmp(a, b) == 0; }
static void check_division(int32_t a, int32_t b) {
  if (b == 0 || (a == INT32_MIN && b == -1)) {
    fputs("CHUD Runtime: invalid integer division\n", stderr);
    exit(70);
  }
}
int32_t chud_div(int32_t a, int32_t b) {
  check_division(a, b);
  return a / b;
}
int32_t chud_mod(int32_t a, int32_t b) {
  check_division(a, b);
  return a % b;
}
