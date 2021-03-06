#ifndef Certificate_h
#define Certificate_h

#include "uDAQC.h"

const uint8_t x509[] PROGMEM = {
  #include "x509.h"
};

// And so is the key.  These could also be in DRAM
const uint8_t rsakey[] PROGMEM = {
  #include "key.h"
};

UDAQC::Network::SecurityBundle bundle
{
  x509,
  sizeof(x509),
  rsakey,
  sizeof(rsakey)
};

#endif
