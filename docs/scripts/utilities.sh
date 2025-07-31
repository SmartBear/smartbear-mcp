#!/bin/bash

# Author: @frankkilcommins
# The script is used to define utility functions that are used by the other scripts in the workflow.

# Log levels
DEBUG=1
INFO=2
WARNING=3
ERROR=4

# Default log level
LOG_LEVEL=${LOG_LEVEL:=$INFO}

log_message() {
    local log_level=$1
    shift
    local message="$@"

    case $log_level in
        $DEBUG)
            ([ $LOG_LEVEL -le $DEBUG ] && echo "$(date '+%Y-%m-%d %H:%M:%S') [DEBUG] $message") || true ;;
        $INFO)
            ([ $LOG_LEVEL -le $INFO ] && echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $message") || true ;;
        $WARNING)
            ([ $LOG_LEVEL -le $WARNING ] && echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $message") || true ;;
        $ERROR)
            ([ $LOG_LEVEL -le $ERROR ] && echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $message" >&2) || true ;;
        *)
            echo "$(date '+%Y-%m-%d %H:%M:%S') [UNKNOWN] $message" ;;
    esac
}