#pragma once
#include <stddef.h>
#include <stdint.h>
void chud_fail(const char *message);
void *chud_alloc(size_t size);
char *chud_copy(const char *text, size_t length);
