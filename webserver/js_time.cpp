// Copyright 2012 the V8 project authors. All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
//       copyright notice, this list of conditions and the following
//       disclaimer in the documentation and/or other materials provided
//       with the distribution.
//     * Neither the name of Google Inc. nor the names of its
//       contributors may be used to endorse or promote products derived
//       from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

#include <windows.h>
#include <cstdint>

// For timeGetTime() (Time in MS)
// The timeGetTime function retrieves the system time, in milliseconds. The system time is the time elapsed since Windows was started.
// under RTX use an alternative
#include <mmsystem.h>  
#pragma comment(lib, "winmm")

#include "js_time.h"

union TimeStamp {
    FILETIME ft_;
    int64_t t_;
};

static const int64_t kTimeEpoc = 116444736000000000LL;
static const int64_t kTimeScaler = 10000;
static const int64_t kHundredNanosecondsPerSecond = 10000000;
static const int64_t kMaxClockElapsedTime = 60*kHundredNanosecondsPerSecond;  // 1 minute

double getJSTime(bool bUTC, int nYear, int nMonth, int nDay, int nHour, int nMinute, int nSecond, int nMilliseconds)
{
    TimeStamp tJS;
    SYSTEMTIME st;
    st.wYear = nYear;
    st.wMonth = nMonth;
    st.wDay = nDay;
    st.wHour = nHour;
    st.wMinute = nMinute;
    st.wSecond = nSecond;
    st.wMilliseconds = nMilliseconds;
    SystemTimeToFileTime(&st, &tJS.ft_);

    // Convert Localtime to UTC
    if(!bUTC)
    {
        FILETIME ftLocal = tJS.ft_;
        LocalFileTimeToFileTime(&ftLocal, &tJS.ft_);
    }

    // Convert timestamp to JavaScript timestamp.
    return static_cast<double>((tJS.t_ - kTimeEpoc) / kTimeScaler);
};

double getCurrentJSTime()
{
    // To use the clock, we use GetSystemTimeAsFileTime as our base;
    // and then use timeGetTime to extrapolate current time from the
    // start time.  To deal with rollovers, we resync the clock
    // any time when more than kMaxClockElapsedTime has passed or
    // whenever timeGetTime creates a rollover.
    static bool initialized = false;
    static TimeStamp init_time;
    static DWORD init_ticks;

    // If we are uninitialized, we need to resync the clock.
    bool needs_resync = !initialized;

    // Get the current time.
    TimeStamp time_now;
    GetSystemTimeAsFileTime(&time_now.ft_);
    DWORD ticks_now = timeGetTime();

    // Check if we need to resync due to clock rollover.
    needs_resync |= ticks_now < init_ticks;

    // Check if we need to resync due to elapsed time.
    needs_resync |= (time_now.t_ - init_time.t_) > kMaxClockElapsedTime;

    // Check if we need to resync due to backwards time change.
    needs_resync |= time_now.t_ < init_time.t_;

    // Resync the clock if necessary.
    if (needs_resync) {
        GetSystemTimeAsFileTime(&init_time.ft_);
        init_ticks = ticks_now = timeGetTime();
        initialized = true;
    }

    // Finally, compute the actual time.
    DWORD elapsed = ticks_now - init_ticks;
    time_now.t_ = init_time.t_ + (static_cast<int64_t>(elapsed) * 10000);

    // Convert timestamp to JavaScript timestamp.
    return static_cast<double>((time_now.t_ - kTimeEpoc) / kTimeScaler);
}
