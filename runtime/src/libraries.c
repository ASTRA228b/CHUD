#define _CRT_SECURE_NO_WARNINGS
#include "libraries.h"
#include <ctype.h>
#include <errno.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <windows.h>

// Until CHUD has a tracing collector, allocated values live until process exit.
// The budget bounds long-running programs and keeps aliases valid.
#define BUDGET (64u * 1024u * 1024u)
#define TEXT_LIMIT (16u * 1024u * 1024u)
typedef struct Allocation {
  void *data;
  size_t size;
  struct Allocation *next;
} Allocation;
static Allocation *allocations;
static size_t allocated;
void chud_fail(const char *message) {
  fprintf(stderr, "CHUD Runtime: %s\n", message);
  exit(70);
}
static void cleanup(void) {
  while (allocations) {
    Allocation *next = allocations->next;
    free(allocations->data);
    free(allocations);
    allocations = next;
  }
}
void *chud_alloc(size_t size) {
  if (!size)
    size = 1;
  if (size > BUDGET || allocated > BUDGET - size)
    chud_fail("64 MiB library allocation budget exceeded");
  Allocation *node = (Allocation *)malloc(sizeof(Allocation));
  void *data = calloc(1, size);
  if (!node || !data)
    chud_fail("Out of memory");
  if (!allocations)
    atexit(cleanup);
  node->data = data;
  node->size = size;
  node->next = allocations;
  allocations = node;
  allocated += size;
  return data;
}
static void *resize(void *data, size_t size) {
  for (Allocation *a = allocations; a; a = a->next)
    if (a->data == data) {
      if (size > BUDGET || allocated - a->size > BUDGET - size)
        chud_fail("64 MiB library allocation budget exceeded");
      void *newData = realloc(data, size);
      if (!newData)
        chud_fail("Out of memory");
      allocated = allocated - a->size + size;
      a->size = size;
      a->data = newData;
      return newData;
    }
  chud_fail("Invalid allocation");
  return NULL;
}
char *chud_copy(const char *text, size_t length) {
  if (length > TEXT_LIMIT)
    chud_fail("Text exceeds 16 MiB");
  char *out = (char *)chud_alloc(length + 1);
  memcpy(out, text, length);
  return out;
}
static int32_t checked(int64_t value) {
  if (value < INT32_MIN || value > INT32_MAX)
    chud_fail("Integer library result is outside int range");
  return (int32_t)value;
}
int32_t chud_math_abs(int32_t n) { return checked(n < 0 ? -(int64_t)n : n); }
int32_t chud_math_min(int32_t a, int32_t b) { return a < b ? a : b; }
int32_t chud_math_max(int32_t a, int32_t b) { return a > b ? a : b; }
int32_t chud_math_clamp(int32_t n, int32_t low, int32_t high) {
  if (low > high)
    chud_fail("Clamp minimum exceeds maximum");
  return chud_math_min(chud_math_max(n, low), high);
}
int32_t chud_math_pow(int32_t base, int32_t exponent) {
  if (exponent < 0)
    chud_fail("Integer exponent must be nonnegative");
  int32_t result = 1;
  while (exponent) {
    if (exponent & 1)
      result = checked((int64_t)result * base);
    exponent >>= 1;
    if (exponent)
      base = checked((int64_t)base * base);
  }
  return result;
}
int32_t chud_math_gcd(int32_t a, int32_t b) {
  int64_t x = a < 0 ? -(int64_t)a : a, y = b < 0 ? -(int64_t)b : b;
  while (y) {
    int64_t t = x % y;
    x = y;
    y = t;
  }
  return checked(x);
}
int32_t chud_text_length(const char *s) {
  int32_t n = 0;
  for (; *s; ++s)
    if (((unsigned char)*s & 0xC0) != 0x80)
      ++n;
  return n;
}
char *chud_text_concat(const char *a, const char *b) {
  size_t x = strlen(a), y = strlen(b);
  if (x > TEXT_LIMIT || y > TEXT_LIMIT - x)
    chud_fail("Text exceeds 16 MiB");
  char *out = (char *)chud_alloc(x + y + 1);
  memcpy(out, a, x);
  memcpy(out + x, b, y);
  return out;
}
int chud_text_contains(const char *s, const char *part) {
  return strstr(s, part) != NULL;
}
int chud_text_starts(const char *s, const char *part) {
  return strncmp(s, part, strlen(part)) == 0;
}
int chud_text_ends(const char *s, const char *part) {
  size_t n = strlen(s), p = strlen(part);
  return p <= n && strcmp(s + n - p, part) == 0;
}
static char *change_case(const char *s, int upper) {
  char *out = chud_copy(s, strlen(s));
  for (char *p = out; *p; ++p)
    if ((unsigned char)*p < 128)
      *p = (char)(upper ? toupper((unsigned char)*p)
                        : tolower((unsigned char)*p));
  return out;
}
char *chud_text_upper(const char *s) { return change_case(s, 1); }
char *chud_text_lower(const char *s) { return change_case(s, 0); }
char *chud_text_trim(const char *s) {
  while (*s && isspace((unsigned char)*s))
    ++s;
  size_t n = strlen(s);
  while (n && isspace((unsigned char)s[n - 1]))
    --n;
  return chud_copy(s, n);
}
char *chud_text_slice(const char *s, int32_t start, int32_t count) {
  int32_t length = chud_text_length(s);
  if (start < 0 || count < 0 || start > length || count > length - start)
    chud_fail("Text slice is out of bounds");
  const char *first = s, *last;
  for (int32_t i = 0; i < start; ++i) {
    ++first;
    while (((unsigned char)*first & 0xC0) == 0x80)
      ++first;
  }
  last = first;
  for (int32_t i = 0; i < count; ++i) {
    ++last;
    while (((unsigned char)*last & 0xC0) == 0x80)
      ++last;
  }
  return chud_copy(first, (size_t)(last - first));
}
char *chud_text_replace(const char *s, const char *old,
                        const char *replacement) {
  size_t a = strlen(old), b = strlen(replacement), length = strlen(s),
         matches = 0;
  if (!a)
    chud_fail("Replace search text cannot be empty");
  if (length > TEXT_LIMIT || b > TEXT_LIMIT)
    chud_fail("Text exceeds 16 MiB");
  for (const char *p = s; (p = strstr(p, old)); p += a)
    ++matches;
  if (b > a && matches > (TEXT_LIMIT - length) / (b - a))
    chud_fail("Text exceeds 16 MiB");
  size_t total = length - matches * a + matches * b;
  if (total > TEXT_LIMIT)
    chud_fail("Text exceeds 16 MiB");
  char *out = (char *)chud_alloc(total + 1), *dst = out;
  const char *p = s, *next;
  while ((next = strstr(p, old))) {
    size_t n = (size_t)(next - p);
    memcpy(dst, p, n);
    dst += n;
    memcpy(dst, replacement, b);
    dst += b;
    p = next + a;
  }
  strcpy(dst, p);
  return out;
}
char *chud_text_repeat(const char *s, int32_t count) {
  size_t n = strlen(s);
  if (count < 0 || (n && (size_t)count > TEXT_LIMIT / n))
    chud_fail("Invalid text repeat size");
  size_t total = n * (size_t)count;
  char *out = (char *)chud_alloc(total + 1);
  if (n)
    for (int32_t i = 0; i < count; ++i)
      memcpy(out + n * i, s, n);
  return out;
}
char *chud_convert_string(int32_t n) {
  char buffer[32];
  snprintf(buffer, sizeof(buffer), "%d", (int)n);
  return chud_copy(buffer, strlen(buffer));
}
static int parse_int(const char *s, int32_t *value) {
  if (!*s || isspace((unsigned char)*s))
    return 0;
  errno = 0;
  char *end;
  long long n = strtoll(s, &end, 10);
  if (errno || *end || end == s || n < INT32_MIN || n > INT32_MAX)
    return 0;
  *value = (int32_t)n;
  return 1;
}
int32_t chud_convert_int(const char *s) {
  int32_t n;
  if (!parse_int(s, &n))
    chud_fail("Invalid integer text");
  return n;
}
int chud_convert_isint(const char *s) {
  int32_t n;
  return parse_int(s, &n);
}
static wchar_t *wide_path(const char *s) {
  int n = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, s, -1, NULL, 0);
  if (!n)
    chud_fail("Invalid UTF-8 path");
  wchar_t *out = (wchar_t *)malloc((size_t)n * sizeof(wchar_t));
  if (!out)
    chud_fail("Out of memory");
  MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, s, -1, out, n);
  return out;
}
static FILE *open_file(const char *path, const wchar_t *mode) {
  wchar_t *name = wide_path(path);
  FILE *file = _wfopen(name, mode);
  free(name);
  if (!file)
    chud_fail("Could not open file");
  return file;
}
char *chud_io_readline(void) {
  char buffer[65538];
  if (!fgets(buffer, sizeof(buffer), stdin)) {
    if (ferror(stdin))
      chud_fail("Console input failed");
    return "";
  }
  size_t n = strlen(buffer);
  if (n && buffer[n - 1] != '\n' && !feof(stdin))
    chud_fail("Input line exceeds 64 KiB");
  while (n && (buffer[n - 1] == '\n' || buffer[n - 1] == '\r'))
    --n;
  return chud_copy(buffer, n);
}
char *chud_io_read(const char *path) {
  FILE *file = open_file(path, L"rb");
  if (_fseeki64(file, 0, SEEK_END))
    chud_fail("Cannot seek file");
  __int64 size = _ftelli64(file);
  if (size < 0 || size > TEXT_LIMIT)
    chud_fail("File exceeds 16 MiB text limit");
  rewind(file);
  char *out = (char *)chud_alloc((size_t)size + 1);
  if (fread(out, 1, (size_t)size, file) != (size_t)size || ferror(file))
    chud_fail("File read failed");
  fclose(file);
  if (memchr(out, 0, (size_t)size))
    chud_fail("ReadText does not accept binary files containing NUL");
  if (size && !MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, out,
                                   (int)size, NULL, 0))
    chud_fail("File is not valid UTF-8 text");
  return out;
}
static void write_text(const char *path, const char *text, int append) {
  FILE *file = open_file(path, append ? L"ab" : L"wb");
  size_t length = strlen(text);
  int failed = fwrite(text, 1, length, file) != length;
  if (fclose(file))
    failed = 1;
  if (failed)
    chud_fail("File write failed");
}
void chud_io_write(const char *path, const char *text) {
  write_text(path, text, 0);
}
void chud_io_append(const char *path, const char *text) {
  write_text(path, text, 1);
}
int chud_io_exists(const char *path) {
  wchar_t *name = wide_path(path);
  DWORD attr = GetFileAttributesW(name);
  free(name);
  return attr != INVALID_FILE_ATTRIBUTES;
}
static const char *filename(const char *s) {
  const char *name = s;
  for (; *s; ++s)
    if (*s == '/' || *s == '\\')
      name = s + 1;
  return name;
}
char *chud_path_filename(const char *s) {
  const char *name = filename(s);
  return chud_copy(name, strlen(name));
}
char *chud_path_extension(const char *s) {
  const char *name = filename(s), *dot = strrchr(name, '.');
  return !dot || dot == name ? "" : chud_copy(dot, strlen(dot));
}
char *chud_path_directory(const char *s) {
  const char *name = filename(s);
  size_t n = (size_t)(name - s);
  if (n > 1 && s[n - 2] != ':')
    --n;
  return chud_copy(s, n);
}
char *chud_path_combine(const char *a, const char *b) {
  if (!*a || *b == '/' || *b == '\\' || (strlen(b) >= 2 && b[1] == ':'))
    return chud_copy(b, strlen(b));
  size_t n = strlen(a);
  if (!*b || a[n - 1] == '/' || a[n - 1] == '\\')
    return chud_text_concat(a, b);
  size_t m = strlen(b);
  if (n + m + 1 > TEXT_LIMIT)
    chud_fail("Path exceeds text limit");
  char *out = (char *)chud_alloc(n + m + 2);
  memcpy(out, a, n);
  out[n] = '/';
  memcpy(out + n + 1, b, m);
  return out;
}
static uint32_t random_state;
void chud_random_seed(int32_t seed) {
  random_state = (uint32_t)seed;
  if (!random_state)
    random_state = 0x6D2B79F5u;
}
static uint32_t random_next(void) {
  if (!random_state)
    chud_random_seed((int32_t)(GetTickCount64() ^ GetCurrentProcessId()));
  random_state ^= random_state << 13;
  random_state ^= random_state >> 17;
  random_state ^= random_state << 5;
  return random_state;
}
int32_t chud_random_range(int32_t low, int32_t high) {
  if (low >= high)
    chud_fail("Random.Range requires minimum < exclusive maximum");
  uint32_t width = (uint32_t)((int64_t)high - low),
           threshold = (uint32_t)(0u - width) % width, value;
  do {
    value = random_next();
  } while (value < threshold);
  return (int32_t)((int64_t)low + value % width);
}
int32_t chud_time_now(void) { return checked((int64_t)time(NULL)); }
int32_t chud_time_millis(void) {
  static ULONGLONG start;
  ULONGLONG now = GetTickCount64();
  if (!start)
    start = now;
  return (int32_t)((now - start) % 2147483648ull);
}
void chud_time_sleep(int32_t ms) {
  if (ms < 0)
    chud_fail("Sleep duration cannot be negative");
  Sleep((DWORD)ms);
}
typedef struct List {
  int32_t *items;
  int32_t count, capacity;
} List;
List *chud_list_new(void) {
  List *list = (List *)chud_alloc(sizeof(List));
  list->capacity = 8;
  list->items = (int32_t *)chud_alloc(8 * sizeof(int32_t));
  return list;
}
void chud_list_add(List *list, int32_t value) {
  if (list->count >= 1000000)
    chud_fail("List exceeds one million items");
  if (list->count == list->capacity) {
    list->capacity *= 2;
    list->items = (int32_t *)resize(list->items,
                                    (size_t)list->capacity * sizeof(int32_t));
  }
  list->items[list->count++] = value;
}
static void list_index(List *list, int32_t index) {
  if (index < 0 || index >= list->count)
    chud_fail("List index is out of bounds");
}
int32_t chud_list_get(List *list, int32_t index) {
  list_index(list, index);
  return list->items[index];
}
void chud_list_set(List *list, int32_t index, int32_t value) {
  list_index(list, index);
  list->items[index] = value;
}
int32_t chud_list_count(List *list) { return list->count; }
void chud_list_remove(List *list, int32_t index) {
  list_index(list, index);
  memmove(list->items + index, list->items + index + 1,
          (size_t)(list->count - index - 1) * sizeof(int32_t));
  --list->count;
}
void chud_list_clear(List *list) { list->count = 0; }
int chud_list_contains(List *list, int32_t value) {
  for (int32_t i = 0; i < list->count; ++i)
    if (list->items[i] == value)
      return 1;
  return 0;
}
static int compare_int(const void *a, const void *b) {
  int32_t x = *(const int32_t *)a, y = *(const int32_t *)b;
  return (x > y) - (x < y);
}
void chud_list_sort(List *list) {
  qsort(list->items, (size_t)list->count, sizeof(int32_t), compare_int);
}
int32_t chud_list_sum(List *list) {
  int64_t total = 0;
  for (int32_t i = 0; i < list->count; ++i)
    total += list->items[i];
  return checked(total);
}
int32_t chud_forge_wrap(int32_t value, int32_t low, int32_t high) {
  int64_t width = (int64_t)high - low;
  if (width <= 0)
    chud_fail("Wrap requires minimum < exclusive maximum");
  int64_t offset = ((int64_t)value - low) % width;
  return (int32_t)(low + (offset < 0 ? offset + width : offset));
}
int32_t chud_forge_step(int32_t value, int32_t target, int32_t step) {
  if (step < 0)
    chud_fail("StepToward step cannot be negative");
  int64_t delta = (int64_t)target - value;
  return (int32_t)(value + (delta > step             ? step
                            : delta < -(int64_t)step ? -(int64_t)step
                                                     : delta));
}
int32_t chud_forge_lerp(int32_t a, int32_t b, int32_t percent) {
  return checked(a + ((int64_t)b - a) * chud_math_clamp(percent, 0, 100) / 100);
}
char *chud_spark_bar(int32_t value, int32_t maximum, int32_t width) {
  if (maximum <= 0 || width < 1 || width > 200)
    chud_fail("Bar requires maximum > 0 and width 1..200");
  int filled =
      (int)((int64_t)chud_math_clamp(value, 0, maximum) * width / maximum);
  char *out = (char *)chud_alloc((size_t)width + 3);
  out[0] = '[';
  for (int i = 0; i < width; ++i)
    out[i + 1] = i < filled ? '#' : '-';
  out[width + 1] = ']';
  return out;
}
char *chud_spark_badge(const char *s) {
  size_t n = strlen(s);
  if (n > TEXT_LIMIT - 4)
    chud_fail("Text exceeds 16 MiB");
  char *out = (char *)chud_alloc(n + 5);
  out[0] = '[';
  out[1] = ' ';
  memcpy(out + 2, s, n);
  out[n + 2] = ' ';
  out[n + 3] = ']';
  return out;
}
