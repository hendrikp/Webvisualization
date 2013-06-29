#include <mongoose.h>

#ifdef __cplusplus
#pragma once

extern "C"
{
#endif

    int begin_request_handler(struct mg_connection *conn);

#ifdef __cplusplus
};
#endif