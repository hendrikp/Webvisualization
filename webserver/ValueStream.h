#include <string>
#include <sstream>
#include <StringUtils.h>
#include <mongoose.h>
#include <vector>

#pragma once

#define SIMVALUES 0 // 1
static const int nSimValues = 100;

#define REPLY_SERVER_TIMESTAMP "sts"
#define REPLY_LAST_CLIENT_TIMESTAMP "lcts"

#define QUERY_STREAM_ID "sid"
#define QUERY_LAST_SERVER_TIMESTAMP "lsts"
#define QUERY_CLIENT_TIMESTAMP "cts"

class CValueStream
{
public:
    CValueStream(void);
    ~CValueStream(void);
    CValueStream(CValueStream& va);

private:
    std::string m_sStreamID;
    char m_streamDataBuffer[MG_BUF_LEN-500]; // 500 for http header
    char* m_streamData;

    double m_fClientTimestampLast;
    double m_fClientTimestamp;

    double m_fServerTimestampLast;
    double m_fServerTimestamp;

    double m_fFrameTimestamp;

    int m_nPacketFrame;

    std::vector<int> m_SubscribedAnalog;
    std::vector<int> m_SubscribedDigital;
    std::vector<int> m_SubscribedString;

public:
    bool isTimedOut();
    void init(std::string m_sStreamID);
    bool extendStream(int nValueID);
    void setValue(int nValueID, std::string sValue);
    bool requestStream(double fClientTimestamp, char** streamPacket, int& nLen);

private:
    inline void beginPacket(double fServerTimestamp);
    inline void beginFrame(double fFrameTimestamp);
    inline void processStreamValues();
    inline void endFrame();
    inline void endPacket();
};

