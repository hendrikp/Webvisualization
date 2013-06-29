#include "ValueStream.h"
#include "js_time.h"
#include <CATSValueProvider.h>

CValueStream::CValueStream(void)
{
}

CValueStream::CValueStream(CValueStream& va)
{
}

CValueStream::~CValueStream(void)
{
}

bool CValueStream::isTimedOut()
{
    return false;
}

void CValueStream::init( std::string sStreamID )
{
    m_sStreamID = sStreamID;

    m_fClientTimestampLast = 0.0;
    m_fClientTimestamp = 0.0;

    m_fServerTimestampLast = 0.0;
    m_fServerTimestamp = 0.0;

    m_fFrameTimestamp= 0.0;

    m_SubscribedAnalog.clear();
    m_SubscribedDigital.clear();
    m_SubscribedString.clear();

#if SIMVALUES == 1
    for(size_t i = 0; i < nSimValues; ++i)
    {
        extendStream( i );
    }
#else
    // TODO: Fürs erste alle automatisch subscriben
    for(size_t i = 0; i < g_CATS.m_vecGroessen.size(); ++i)
    {
        extendStream( i );
    }
#endif
}

void CValueStream::setValue(int nValueID, std::string sValue)
{
#if SIMVALUES != 1
    if(nValueID >= 0 && nValueID < g_CATS.m_vecGroessen.size())
    {
        GroessenDaten& daten = g_CATS.m_vecGroessen[nValueID];

        if(daten.bAnalog)
            _setvalue(daten, toValue<typePAPAnalog>(sValue));
        else if(daten.bDigital)
            _setvalue(daten, toValue<typePAPDigital>(sValue));
        else if(daten.bString)
            _setvalue(daten, sValue);
    }
#endif
}

bool CValueStream::extendStream( int nValueID )
{
#if SIMVALUES == 1
    m_SubscribedAnalog.push_back(nValueID);
    return true;
#else
    if( g_CATS.isloaded() )
    {
        if(nValueID >= 0 && nValueID < g_CATS.m_vecGroessen.size())
        {
            GroessenDaten& daten = g_CATS.m_vecGroessen[nValueID];

            if(daten.bAnalog)
                m_SubscribedAnalog.push_back(nValueID);
            else if(daten.bDigital)
                m_SubscribedDigital.push_back(nValueID);
            else if(daten.bString)
                m_SubscribedString.push_back(nValueID);
            
            return true;
        }
    }
#endif

    return false;
}

bool CValueStream::requestStream( double fClientTimestamp, char** streamPacket, int& nLen )
{
    m_fClientTimestamp = fClientTimestamp;

    // Only send data if its the most current request
    if(m_fClientTimestampLast < m_fClientTimestamp)
    {
        m_fClientTimestampLast = m_fClientTimestamp;

        // Reset Stream
        m_streamData = m_streamDataBuffer;

        // Make Packet
        beginPacket(getCurrentJSTime());
        beginFrame(getCurrentJSTime());
        processStreamValues();
        endFrame();
        endPacket();

        *streamPacket = m_streamDataBuffer;
        nLen = m_streamData - m_streamDataBuffer;
        return true;
    }

    streamPacket = NULL;
    nLen = 0;
    return isTimedOut();
}

void CValueStream::beginPacket( double fServerTimestamp )
{
    m_nPacketFrame = 0;
    m_fServerTimestampLast = m_fServerTimestamp;
    m_fServerTimestamp = fServerTimestamp;

    m_streamData += sprintf(m_streamData,
        "{"
        "\"" REPLY_SERVER_TIMESTAMP "\":%.0lf,\n"
        "\"" REPLY_LAST_CLIENT_TIMESTAMP "\":%.0lf,\n"
        "\"d\":[",
        m_fServerTimestamp,
        m_fClientTimestamp
        );
}

void CValueStream::beginFrame( double fFrameTimestamp )
{
    m_streamData += sprintf(m_streamData,
        "%s\n{"
        "\"t\":%.0lf,\n",
        m_nPacketFrame > 0 ? "," : "",
        getCurrentJSTime());
}

void CValueStream::endPacket()
{
    m_streamData += sprintf(m_streamData, "\n]}");
}

void CValueStream::endFrame()
{
    m_streamData += sprintf(m_streamData, "}");
    ++m_nPacketFrame;
}

#define COLLECT_DATA(stream, source, len, step, format) \
    { \
        int i = 0; \
        for(i = 0; i < len-step; i += step) \
        {\
            stream += sprintf(stream, \
                                format format format format format format format format format format format format format format format format format format format format, \
                                source[i], source[i+1], source[i+2], source[i+3], source[i+4], source[i+5], source[i+6], source[i+7], source[i+8], source[i+9], source[i+10], source[i+11], source[i+12], source[i+13], source[i+14], source[i+15], source[i+16], source[i+17], source[i+18], source[i+19] \
                              );\
        }\
        for(; i < len; ++i) \
        {\
            stream += sprintf(m_streamData, format, source[i]); \
        }\
    }

#if SIMVALUES == 1
    #define gv(source, n, formatType, sourceType, conversion) (formatType)(rand() % 101)
#else
    #define gv(source, n, formatType, sourceType, conversion) (formatType)(_getvalue<sourceType>(g_CATS.m_vecGroessen[source[n]])conversion)
#endif

#define COLLECT_DATA_EX(stream, source, len, step, format, formatType, sourceType, conversion) \
{ \
    int i = 0; \
    for(i = 0; i < len-step; i += step) {\
        stream += sprintf(stream, \
        format format format format format format format format format format format format format format format format format format format format, \
        gv(source, i, formatType, sourceType, conversion), gv(source, i+1, formatType, sourceType, conversion), gv(source, i+2, formatType, sourceType, conversion), gv(source, i+3, formatType, sourceType, conversion), gv(source, i+4, formatType, sourceType, conversion), gv(source, i+5, formatType, sourceType, conversion), gv(source, i+6, formatType, sourceType, conversion), gv(source, i+7, formatType, sourceType, conversion), gv(source, i+8, formatType, sourceType, conversion), gv(source, i+9, formatType, sourceType, conversion), gv(source, i+10, formatType, sourceType, conversion), gv(source, i+11, formatType, sourceType, conversion), gv(source, i+12, formatType, sourceType, conversion), gv(source, i+13, formatType, sourceType, conversion), gv(source, i+14, formatType, sourceType, conversion), gv(source, i+15, formatType, sourceType, conversion), gv(source, i+16, formatType, sourceType, conversion), gv(source, i+17, formatType, sourceType, conversion), gv(source, i+18, formatType, sourceType, conversion), gv(source, i+19, formatType, sourceType, conversion) \
        );\
    }\
    for(; i < len; ++i) {\
        stream += sprintf(m_streamData, format, gv(source, i, formatType, sourceType, conversion)); \
    }\
}

// If there are no values, NULL is returned.
void CValueStream::processStreamValues()
{
    if( SIMVALUES || g_CATS.isloaded() )
    {
        m_streamData += sprintf(m_streamData, "\"i\":[");

        // Indexes
        COLLECT_DATA(m_streamData, m_SubscribedAnalog, int(m_SubscribedAnalog.size()), 20, "%d,");
        COLLECT_DATA(m_streamData, m_SubscribedDigital, int(m_SubscribedDigital.size()), 20, "%d,");
        COLLECT_DATA(m_streamData, m_SubscribedString, int(m_SubscribedString.size()), 20, "%d,");

        --m_streamData; // remove ','
        
        m_streamData += sprintf(m_streamData, "],\n" "\"v\":[");

        // Values
        COLLECT_DATA_EX(m_streamData, m_SubscribedAnalog, int(m_SubscribedAnalog.size()), 20, "%g,", typePAPAnalog, typePAPAnalog,);
        COLLECT_DATA_EX(m_streamData, m_SubscribedDigital, int(m_SubscribedDigital.size()), 20, "%hu,", typePAPDigital, typePAPDigital,);
        COLLECT_DATA_EX(m_streamData, m_SubscribedString, int(m_SubscribedString.size()), 20, "\"%s\",", typePAPString, typeExtString, .c_str());

        m_streamData[-1] = ']'; // overwrite ','
    }
}