#include "CATSValueProvider.h"

CATSFunktionen g_CATS;

CCATSValueProvider::CCATSValueProvider(void)
{
}

CCATSValueProvider::~CCATSValueProvider(void)
{
}

void CCATSValueProvider::run()
{
    // Treiber
    while(true)
    { // F�r immer das Programm laufen lassen

        while( g_CATS.isloaded() )
        { // Wenn Pr�fprogramm geladen
            g_CATS.sleep(10);
        }
        g_CATS.sleep(10);
    }
}
