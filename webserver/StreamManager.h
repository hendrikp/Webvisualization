#include "ValueStream.h"
#include <map>
#include <string>

#pragma once
class CStreamManager
{
public:
    CStreamManager(void);
    ~CStreamManager(void);

    std::map<std::string, CValueStream> m_Streams;

    std::string createStream(std::string sDocumentRoot, std::string sIP, std::string sUser, const void* pRand1, const void* pRand2, std::string& sInfos );

    CValueStream* CStreamManager::getStream( std::string sStreamID );
};

extern CStreamManager g_StreamManager;
