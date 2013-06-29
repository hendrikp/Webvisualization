#include <catsdata.h>

#include <stdlib.h>
#include <string.h>

#include <StringUtils.h>
#include "StreamManager.h"

extern "C" struct mg_context *ctx;      // Set by start_mongoose()

#define MAX_QUERY_VAR_LENGTH 256

void get_qsvar(const struct mg_request_info *request_info, const char *name, char *dst, size_t dst_len)
{
    const char *qs = request_info->query_string;
    mg_get_var(qs, strlen(qs == NULL ? "" : qs), name, dst, dst_len);
}

template<typename tDataType>
static tDataType GetQueryVar( const struct mg_request_info *request_info, const char* sVar )
{
    char sQueryVal[MAX_QUERY_VAR_LENGTH];
    memset(sQueryVal, 0, sizeof(sQueryVal));
    get_qsvar(request_info, sVar, sQueryVal, sizeof(sQueryVal)-1);

    return toValue<tDataType>(sQueryVal);
};

// Everything is OK
const char *ajax_reply_ok_post =
    "HTTP/1.1 200 OK\r\n"
    "Cache: no-cache, no-store\r\n"
    "Content-Length: 0\r\n"
    "\r\n"; // hendrik //;

// Everything is OK
const char *ajax_reply_ok =
    "HTTP/1.1 200 OK\r\n"
    "Cache: no-cache, no-store\r\n"
    "Content-Type: application/json\r\n"
    "Content-Length: %d\r\n"
    "\r\n%s%s"; // hendrik //;

// Invalid StreamID
const char *ajax_reply_forbidden =
    "HTTP/1.1 403 Forbidden\r\n"
    "Content-Length: 0\r\n"
    "\r\n";

// 503 Service Unavailable
const char *ajax_reply_offline =
    "HTTP/1.1 503 Service Unavailable\r\n"
    "Content-Length: 0\r\n"
    "\r\n";

void replyJSON(struct mg_connection *conn, const std::string& sData)
{
    if(sData.empty())
    {
        mg_printf(conn, ajax_reply_ok, sData.length(), "", "");
    } else {
        mg_printf(conn, ajax_reply_ok, sData.length(), sData.c_str(), "\r\n\r\n");
    }
}

void replyJSON(struct mg_connection *conn, const char* sData, int nLen)
{
    if(nLen <= 0)
    {
        mg_printf(conn, ajax_reply_ok, nLen, "", "");
    } else {
        mg_printf(conn, ajax_reply_ok, nLen, sData, "\r\n\r\n");
    }
}

bool aquireStreamAccess(struct mg_connection *conn, const struct mg_request_info *request_info, std::string& sStreamID)
{
    sStreamID = GetQueryVar<std::string>( request_info, QUERY_STREAM_ID);
    if(sStreamID.empty())
    {
        mg_printf(conn, "%s", ajax_reply_forbidden);
        
        return false;
    }
    // Now check actual access rights (TODO)

    return true;
}

void ajax_stream(struct mg_connection *conn, const struct mg_request_info *request_info)
{
    std::string sStreamID;
    
    if(aquireStreamAccess(conn, request_info, sStreamID))
    {
        double fLastServerTimestamp = GetQueryVar<double>( request_info, QUERY_LAST_SERVER_TIMESTAMP);
        double fClientTimestamp = GetQueryVar<double>( request_info, QUERY_CLIENT_TIMESTAMP);

        CValueStream* stream = g_StreamManager.getStream(sStreamID);

        char* sData = NULL;
        int nLen = 0;
        if(stream && stream->requestStream(fClientTimestamp, &sData, nLen))
        {
            replyJSON(conn, sData, nLen);
        }
    }
}

void ajax_stream_set(struct mg_connection *conn, const struct mg_request_info *request_info)
{
    std::string sStreamID;

    if(aquireStreamAccess(conn, request_info, sStreamID))
    {
        int nValueID = GetQueryVar<int>( request_info, "var");
        std::string sValue = GetQueryVar<std::string>( request_info, "val");

        CValueStream* stream = g_StreamManager.getStream(sStreamID);

        if(stream)
        {
            stream->setValue(nValueID, sValue);
        }

        mg_printf(conn, ajax_reply_ok_post);
    }
}

void ajax_stream_create(struct mg_connection *conn, const struct mg_request_info *request_info)
{
    // Save Stream ID + User + IP for later access check
    // TODO: needs to be threadsafe
    // Check if streamid already exists if so generate a new one

    std::string sContent;
    g_StreamManager.createStream(mg_get_option(ctx, "document_root"), toString(request_info->remote_ip), request_info->remote_user, conn, request_info, sContent);

    // Return the Stream ID
    replyJSON(conn, sContent);
}

#define MAX_UPLOAD 1*1024*1024 // set to 1MB max
#define UPLOAD_BUFFER 1024

void ajax_upload_file(std::string sPath, struct mg_connection *conn)
{
    // Get Length
    int nLength = MAX_UPLOAD;
    const char* sLen = mg_get_header(conn, "Content-Length");
    if (sLen != NULL)
    {
        nLength = toValue<int>(sLen);
    }
    if(nLength > MAX_UPLOAD)
        nLength = MAX_UPLOAD;

    // Buffer
    char buf[UPLOAD_BUFFER];
    std::stringstream sbuf(std::ios_base::in | std::ios_base::out | std::ios_base::binary);

    // Read POST data, write into file
    int n = 0;
    int nRead = 0;
    while((n = mg_read(conn, buf, UPLOAD_BUFFER)) > 0 && nRead < nLength)
    {
        nRead += n;
        sbuf.write(buf, n);
    }

    // If not too much data
    if(nRead <= nLength)
    {
        StringUtils::StringToFile(sPath, sbuf.str());
    }
}

void ajax_view_save(struct mg_connection *conn, const struct mg_request_info *request_info)
{
    std::string sPath = mg_get_option(ctx, "document_root");
    sPath += "/view/";
    sPath += GetQueryVar<std::string>( request_info, "name");
    sPath += ".json";

    ajax_upload_file(sPath, conn);

    mg_printf(conn, ajax_reply_ok_post);
}

// for < 3.8, 3.9 
/*
extern "C" {
    int check_authorization(struct mg_connection *conn, const char *path);
    void send_authorization_request(struct mg_connection *conn);
}
*/

int begin_request_handler(struct mg_connection *conn)
{
    const struct mg_request_info *request_info = mg_get_request_info(conn);
    int processed = 1;

    /* // for < 3.8, 3.9 
    // Always request digest authentication
    if (!check_authorization(conn, ""))
    {
        send_authorization_request(conn);
    }
    // GET Handle regular stream (all once, then changes)
    else*/
    if (strcmp(request_info->uri, "/cats/stream.json") == 0)
    {
        ajax_stream(conn, request_info);
    }
    // GET Create a new stream and get the streamid
    else if (strcmp(request_info->uri, "/cats/stream_create.json") == 0)
    {
        ajax_stream_create(conn, request_info);
    }
    // POST Add variables to stream
    else if (strcmp(request_info->uri, "/cats/stream") == 0 && strcmp(request_info->request_method, "POST") == 0)
    {

    }
    // POST Modify variables if allowed to
    else if (strcmp(request_info->uri, "/cats/stream_set") == 0 && strcmp(request_info->request_method, "POST") == 0)
    {
        ajax_stream_set(conn, request_info);
    }
    // POST Modify variables if allowed to
    else if (strcmp(request_info->uri, "/cats/view_save") == 0 && strcmp(request_info->request_method, "POST") == 0)
    {
        ajax_view_save(conn, request_info);
    }
    else
    {
        // No suitable handler found, mark as not processed. Mongoose will try to serve the request.
        processed = 0;
    }

    return processed;
}
