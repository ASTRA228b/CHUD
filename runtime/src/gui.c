#define _CRT_SECURE_NO_WARNINGS
#include "libraries.h"
#include <stdio.h>
#include <stdlib.h>
#include <windows.h>
#include <windowsx.h>

// Original CHUD implementation of immediate-mode controls, using Win32/GDI.
static HWND window;
static HDC canvas;
static HBITMAP bitmap, original_bitmap;
static HFONT font;
static int width, height, buffer_width, buffer_height, frame, closing;
static int mouse_x, mouse_y, down, clicked, press_x, press_y;
static int focus_id, next_id, previous_count, activate, key_delta, layout_y;
static const COLORREF background = RGB(30, 30, 30),
                      foreground = RGB(230, 230, 230);
static const COLORREF border = RGB(85, 85, 95), accent = RGB(119, 83, 190);
static wchar_t *wide(const char *text) {
  int count =
      MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, text, -1, NULL, 0);
  if (!count)
    chud_fail("GUI text must be UTF-8");
  wchar_t *out = (wchar_t *)malloc((size_t)count * sizeof(wchar_t));
  if (!out)
    chud_fail("Out of memory");
  MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, text, -1, out, count);
  return out;
}
static void fill(RECT rect, COLORREF color) {
  HBRUSH brush = CreateSolidBrush(color);
  if (!brush)
    chud_fail("GUI brush creation failed");
  FillRect(canvas, &rect, brush);
  DeleteObject(brush);
}
static void outline(RECT rect, COLORREF color) {
  HBRUSH brush = CreateSolidBrush(color);
  FrameRect(canvas, &rect, brush);
  DeleteObject(brush);
}
static void text(RECT rect, const char *label, UINT flags) {
  wchar_t *label_w = wide(label);
  SetTextColor(canvas, foreground);
  SetBkMode(canvas, TRANSPARENT);
  DrawTextW(canvas, label_w, -1, &rect,
            flags | DT_SINGLELINE | DT_VCENTER | DT_END_ELLIPSIS | DT_NOPREFIX);
  free(label_w);
}
static void release_buffer(void) {
  if (canvas) {
    SelectObject(canvas, original_bitmap);
    DeleteObject(bitmap);
    DeleteDC(canvas);
  }
  canvas = NULL;
  bitmap = NULL;
}
static void cleanup_gui(void) {
  if (window)
    DestroyWindow(window);
  release_buffer();
  if (font)
    DeleteObject(font);
  font = NULL;
}
static LRESULT CALLBACK procedure(HWND hwnd, UINT message, WPARAM wp,
                                  LPARAM lp) {
  switch (message) {
  case WM_CLOSE:
    DestroyWindow(hwnd);
    return 0;
  case WM_DESTROY:
    window = NULL;
    down = 0;
    return 0;
  case WM_ERASEBKGND:
    return 1;
  case WM_PAINT: {
    PAINTSTRUCT paint;
    HDC dc = BeginPaint(hwnd, &paint);
    if (canvas)
      BitBlt(dc, 0, 0, buffer_width, buffer_height, canvas, 0, 0, SRCCOPY);
    EndPaint(hwnd, &paint);
    return 0;
  }
  case WM_MOUSEMOVE:
    mouse_x = GET_X_LPARAM(lp);
    mouse_y = GET_Y_LPARAM(lp);
    return 0;
  case WM_LBUTTONDOWN:
    down = 1;
    press_x = mouse_x = GET_X_LPARAM(lp);
    press_y = mouse_y = GET_Y_LPARAM(lp);
    SetCapture(hwnd);
    SetFocus(hwnd);
    return 0;
  case WM_LBUTTONUP:
    down = 0;
    clicked = 1;
    mouse_x = GET_X_LPARAM(lp);
    mouse_y = GET_Y_LPARAM(lp);
    ReleaseCapture();
    return 0;
  case WM_CAPTURECHANGED:
    down = 0;
    return 0;
  case WM_KILLFOCUS:
    down = clicked = activate = 0;
    return 0;
  case WM_KEYDOWN:
    if (wp == VK_TAB && previous_count) {
      focus_id = (focus_id +
                  ((GetKeyState(VK_SHIFT) & 0x8000) ? previous_count - 1 : 1)) %
                 previous_count;
      return 0;
    }
    if (!(lp & (1ll << 30)) && (wp == VK_RETURN || wp == VK_SPACE)) {
      activate = 1;
      return 0;
    }
    if (wp == VK_LEFT || wp == VK_DOWN)
      key_delta = -1;
    if (wp == VK_RIGHT || wp == VK_UP)
      key_delta = 1;
    if (wp == VK_ESCAPE) {
      closing = 1;
      return 0;
    }
    break;
  }
  return DefWindowProcW(hwnd, message, wp, lp);
}
void chud_gui_open(const char *title, int32_t w, int32_t h) {
  if (window)
    chud_fail("Only one GUI window can be open");
  if (w < 240 || w > 3840 || h < 160 || h > 2160)
    chud_fail("GUI size must be 240..3840 by 160..2160");
  static int registered;
  if (!registered) {
    WNDCLASSW cls = {0};
    cls.lpfnWndProc = procedure;
    cls.hInstance = GetModuleHandleW(NULL);
    cls.lpszClassName = L"CHUD.ImmediateGUI";
    cls.hCursor = LoadCursor(NULL, IDC_ARROW);
    if (!RegisterClassW(&cls))
      chud_fail("GUI window class registration failed");
    atexit(cleanup_gui);
    registered = 1;
  }
  if (!font)
    font = CreateFontW(-16, 0, 0, 0, FW_NORMAL, 0, 0, 0, DEFAULT_CHARSET,
                       OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
                       CLEARTYPE_QUALITY, DEFAULT_PITCH, L"Segoe UI");
  RECT rect = {0, 0, w, h};
  AdjustWindowRect(&rect, WS_OVERLAPPEDWINDOW, FALSE);
  wchar_t *title_w = wide(title);
  window = CreateWindowExW(0, L"CHUD.ImmediateGUI", title_w,
                           WS_OVERLAPPEDWINDOW, CW_USEDEFAULT, CW_USEDEFAULT,
                           rect.right - rect.left, rect.bottom - rect.top, NULL,
                           NULL, GetModuleHandleW(NULL), NULL);
  free(title_w);
  if (!window)
    chud_fail("GUI window creation failed");
  closing = frame = clicked = down = 0;
  focus_id = -1;
  previous_count = 0;
  ShowWindow(window, SW_SHOW);
  UpdateWindow(window);
}
int chud_gui_begin(void) {
  if (frame)
    chud_fail("EndFrame must finish the previous frame");
  if (closing && window)
    DestroyWindow(window);
  if (!window)
    return 0;
  clicked = activate = key_delta = 0;
  MSG message;
  while (PeekMessageW(&message, NULL, 0, 0, PM_REMOVE)) {
    if (message.message == WM_QUIT) {
      closing = 1;
      break;
    }
    TranslateMessage(&message);
    DispatchMessageW(&message);
  }
  if (closing && window)
    DestroyWindow(window);
  if (!window)
    return 0;
  // A minimized window still pumps messages without busy-spinning.
  while (window && IsIconic(window)) {
    int status = GetMessageW(&message, NULL, 0, 0);
    if (status < 0)
      chud_fail("GUI message processing failed");
    if (!status)
      return 0;
    TranslateMessage(&message);
    DispatchMessageW(&message);
  }
  if (!window)
    return 0;
  RECT client;
  GetClientRect(window, &client);
  width = client.right;
  height = client.bottom;
  if (width < 1 || height < 1)
    chud_fail("Invalid GUI client size");
  if (!canvas || width != buffer_width || height != buffer_height) {
    release_buffer();
    HDC dc = GetDC(window);
    canvas = CreateCompatibleDC(dc);
    bitmap = CreateCompatibleBitmap(dc, width, height);
    ReleaseDC(window, dc);
    if (!canvas || !bitmap)
      chud_fail("GUI backing surface creation failed");
    original_bitmap = (HBITMAP)SelectObject(canvas, bitmap);
    buffer_width = width;
    buffer_height = height;
    SelectObject(canvas, font);
  }
  fill(client, background);
  frame = 1;
  next_id = 0;
  layout_y = 18;
  return 1;
}
static void require_frame(void) {
  if (!frame || !window)
    chud_fail("GUI controls require a successful BeginFrame");
}
static RECT rect_for(int32_t x, int32_t y, int32_t w, int32_t h) {
  require_frame();
  if (x < -32768 || x > 32768 || y < -32768 || y > 32768 || w < 1 ||
      w > 32768 || h < 1 || h > 32768)
    chud_fail("Invalid GUI control rectangle");
  RECT r = {x, y, x + w, y + h};
  return r;
}
static int inside(RECT r, int x, int y) {
  return x >= r.left && x < r.right && y >= r.top && y < r.bottom;
}
void chud_gui_label(int32_t x, int32_t y, int32_t w, int32_t h,
                    const char *label) {
  text(rect_for(x, y, w, h), label, DT_LEFT);
}
void chud_gui_box(int32_t x, int32_t y, int32_t w, int32_t h,
                  const char *label) {
  RECT r = rect_for(x, y, w, h);
  fill(r, RGB(38, 38, 42));
  outline(r, border);
  r.left += 8;
  r.right -= 8;
  text(r, label, DT_LEFT);
}
int chud_gui_button(int32_t x, int32_t y, int32_t w, int32_t h,
                    const char *label) {
  RECT r = rect_for(x, y, w, h);
  int id = next_id++, hover = inside(r, mouse_x, mouse_y);
  int hit = clicked && hover && inside(r, press_x, press_y);
  if (hit) {
    focus_id = id;
    clicked = 0;
  }
  int key_hit = focus_id == id && activate;
  if (key_hit)
    activate = 0;
  fill(r, hover ? RGB(65, 55, 85) : RGB(49, 49, 55));
  outline(r, focus_id == id ? accent : border);
  text(r, label, DT_CENTER);
  return hit || key_hit;
}
void chud_gui_end(void) {
  require_frame();
  HDC dc = GetDC(window);
  BitBlt(dc, 0, 0, width, height, canvas, 0, 0, SRCCOPY);
  ReleaseDC(window, dc);
  previous_count = next_id;
  if (focus_id >= previous_count)
    focus_id = -1;
  frame = 0;
  Sleep(16);
}
void chud_gui_close(void) {
  closing = 1;
  if (!frame && window)
    DestroyWindow(window);
}
static int layout_width(void) {
  require_frame();
  return width > 48 ? width - 36 : 12;
}
void chud_layout_label(const char *label) {
  int w = layout_width();
  chud_gui_label(18, layout_y, w, 26, label);
  layout_y += 32;
}
void chud_layout_value(const char *label, int32_t value) {
  int w = layout_width();
  char number[32];
  snprintf(number, sizeof(number), "%d", (int)value);
  RECT r = rect_for(18, layout_y, w, 26), name = r;
  name.right -= 95;
  text(name, label, DT_LEFT);
  r.left = name.right;
  text(r, number, DT_RIGHT);
  layout_y += 32;
}
int chud_layout_button(const char *label) {
  int w = layout_width();
  int hit = chud_gui_button(18, layout_y, w, 32, label);
  layout_y += 40;
  return hit;
}
int chud_layout_toggle(const char *label, int value) {
  // Render using the caller's state; return the next state each frame.
  int w = layout_width();
  RECT r = rect_for(18, layout_y, w, 32);
  int next = chud_gui_button(18, layout_y, w, 32, "") ? !value : value;
  RECT check = {r.left + 9, r.top + 8, r.left + 25, r.top + 24};
  outline(check, next ? accent : border);
  if (next) {
    RECT mark = {check.left + 4, check.top + 4, check.right - 4,
                 check.bottom - 4};
    fill(mark, accent);
  }
  r.left += 34;
  text(r, label, DT_LEFT);
  layout_y += 40;
  return next;
}
int32_t chud_layout_slider(const char *label, int32_t value, int32_t low,
                           int32_t high) {
  int w = layout_width();
  if (low >= high)
    chud_fail("Slider requires minimum < maximum");
  if (value < low)
    value = low;
  if (value > high)
    value = high;
  chud_layout_value(label, value);
  RECT r = rect_for(18, layout_y, w, 24);
  int id = next_id++;
  int interacting = (down || clicked) && inside(r, press_x, press_y);
  if (interacting) {
    focus_id = id;
    int x = mouse_x < r.left     ? r.left
            : mouse_x >= r.right ? r.right - 1
                                 : mouse_x;
    value = (int32_t)(low +
                      (int64_t)(x - r.left) * ((int64_t)high - low) / (w - 1));
    clicked = 0;
  }
  if (focus_id == id && key_delta) {
    int64_t n = (int64_t)value + key_delta;
    value = n < low ? low : n > high ? high : (int32_t)n;
    key_delta = 0;
  }
  RECT track = {r.left, r.top + 10, r.right, r.top + 14};
  fill(track, border);
  int position =
      (int)((int64_t)(value - (int64_t)low) * (w - 1) / ((int64_t)high - low));
  RECT knob = {r.left + position - 4, r.top + 3, r.left + position + 5,
               r.bottom - 3};
  fill(knob, accent);
  if (focus_id == id)
    outline(r, accent);
  layout_y += 34;
  return value;
}
void chud_layout_space(int32_t pixels) {
  require_frame();
  if (pixels < 0 || pixels > 4096 || layout_y > 32768 - pixels)
    chud_fail("Invalid layout spacing");
  layout_y += pixels;
}
