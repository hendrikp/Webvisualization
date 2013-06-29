#include "StreamManager.h"
#include "js_time.h"
#include "mongoose.h"
#include <CATSValueProvider.h>

CStreamManager g_StreamManager;

CStreamManager::CStreamManager(void)
{
}

CStreamManager::~CStreamManager(void)
{
}

std::string CStreamManager::createStream(std::string sDocumentRoot, std::string sIP, std::string sUser, const void* pRand1, const void* pRand2, std::string& sInfos )
{
    std::string ssStreamID = "";

    if(SIMVALUES || g_CATS.isloaded())
    {
        char sStreamID[33];
        char sRandom[256];

        // Connection, Request, local pointer and rand for further uniqueness
        _snprintf(sRandom, sizeof(sRandom), "%p %p %lf %d", pRand1, pRand2, double(getCurrentJSTime()), int(rand()) );

        // User + Time + Pointers (should be enough to generate id)
        mg_md5(sStreamID, sIP.c_str(), sUser.c_str(), sRandom, NULL);

        ssStreamID = sStreamID;

        m_Streams.insert(std::pair<std::string, CValueStream>(ssStreamID, CValueStream()));
        m_Streams[ssStreamID].init(ssStreamID);

        std::ostringstream streamData;
        {
            streamData << "{";

            // Stream ID
            streamData << "\"" QUERY_STREAM_ID "\":\"";
            streamData << ssStreamID;
            streamData << "\"," << std::endl;

            // Data
            streamData << "\"d\":[";

            if(SIMVALUES)
            {
                streamData << StringUtils::FileToString(sDocumentRoot + "\\offsim\\stream_create_data.json");
            } else
            {
                // Alle Infos
                for ( auto iter = g_CATS.m_vecGroessen.begin(); iter != g_CATS.m_vecGroessen.end(); ++iter )
                {
                    if(iter != g_CATS.m_vecGroessen.begin())
                        streamData << ",";

                    streamData << "{\"n\":\"";
                    streamData << iter->sName;

                    streamData << "\",\"id\":";
                    streamData << iter->nID;

                    streamData << ",\"d\":\"";
                    streamData << iter->sGeraet;

                    streamData << "\",\"u\":\"";
                    streamData << iter->sEinheit;

                    streamData << "\",\"c\":\"";
                    streamData << iter->sKommentar;

                    streamData << "\",\"dt\":";
                    streamData << int(iter->eType);

                    streamData << ",\"dta\":";
                    streamData << iter->bAnalog;

                    streamData << ",\"dtd\":";
                    streamData << iter->bDigital;

                    streamData << ",\"dts\":";
                    streamData << iter->bString;

                    streamData << ",\"s\":";
                    streamData << iter->bSystem;

                    streamData << ",\"i\":";
                    streamData << iter->bInput;

                    streamData << "}";
                }
            }
            streamData << std::boolalpha << std::fixed;



            streamData << "]}";
        }

        sInfos = streamData.str();
    }

    return ssStreamID;
}

CValueStream* CStreamManager::getStream( std::string sStreamID )
{
    auto iter = m_Streams.find(sStreamID);

    if(iter != m_Streams.end())
        return &(iter->second);

    return NULL;
}
