#include "ini.h"

#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Trim leading and trailing whitespace */
static char* trim(char* str) {
  char* end;
  while (isspace((unsigned char)*str))
    str++;
  if (*str == 0)
    return str;
  end = str + strlen(str) - 1;
  while (end > str && isspace((unsigned char)*end))
    end--;
  end[1] = '\0';
  return str;
}

int tt_config_ini_read(const char* filepath, const char* key, char* buf,
                       size_t bufsize) {
  FILE* f = fopen(filepath, "r");
  if (!f)
    return -1;

  char line[256];
  char current_section[64] = "";
  char search_section[64] = "";
  char search_key[64] = "";

  /* Split key into section.key */
  const char* dot = strchr(key, '.');
  if (dot) {
    size_t section_len = dot - key;
    if (section_len >= sizeof(search_section)) {
      fclose(f);
      return -1;
    }
    strncpy(search_section, key, section_len);
    search_section[section_len] = '\0';
    strncpy(search_key, dot + 1, sizeof(search_key) - 1);
  } else {
    strncpy(search_key, key, sizeof(search_key) - 1);
  }

  while (fgets(line, sizeof(line), f)) {
    char* trimmed = trim(line);

    /* Skip empty lines and comments */
    if (trimmed[0] == '\0' || trimmed[0] == '#' || trimmed[0] == ';') {
      continue;
    }

    /* Section [name] */
    if (trimmed[0] == '[') {
      char* end = strchr(trimmed, ']');
      if (end) {
        *end = '\0';
        strncpy(current_section, trimmed + 1, sizeof(current_section) - 1);
      }
      continue;
    }

    /* Key = value */
    char* eq = strchr(trimmed, '=');
    if (eq) {
      *eq = '\0';
      char* k = trim(trimmed);
      char* v = trim(eq + 1);

      /* Check for match */
      int section_match = (search_section[0] == '\0' ||
                           strcmp(current_section, search_section) == 0);
      int key_match = (strcmp(k, search_key) == 0);

      if (section_match && key_match) {
        /* Copy into user buffer */
        strncpy(buf, v, bufsize - 1);
        buf[bufsize - 1] = '\0';
        fclose(f);
        return 0; /* Success */
      }
    }
  }

  fclose(f);
  return -1; /* Not found */
}
