#include <StdAfx.h>
#include <CATSFunktionen.h>

#pragma once

extern CATSFunktionen g_CATS;

class CCATSValueProvider
{
public:
    CCATSValueProvider(void);
    ~CCATSValueProvider(void);

    void run();
};

