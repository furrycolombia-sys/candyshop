#!/bin/bash
# test-prompt-delivery.sh
# Tests how Claude CLI handles prompt arguments

export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

echo "=== Claude Prompt Delivery Test ==="
echo ""

# Test 1: Check if Claude auto-submits prompts
echo "Test 1: Does Claude auto-submit prompt arguments?"
echo "Running: claude 'hello test'"
echo "Expected: Claude should respond to 'hello test' automatically"
echo ""
echo "Press Enter to run test (Ctrl+C to skip)..."
read

timeout 30 claude "hello test" || echo "Test completed or timed out"

echo ""
echo "=== Results ==="
echo "Did Claude:"
echo "  a) Immediately respond to 'hello test'? (auto-submit works)"
echo "  b) Show 'hello test' in input but wait for Enter? (no auto-submit)"
echo "  c) Show an error? (prompt not recognized)"
echo ""

# Test 2: Test with slash command
echo "Test 2: Testing with slash command format"
echo "Running: claude '/test-ascii --no-restart'"
echo ""
echo "Press Enter to run test (Ctrl+C to skip)..."
read

timeout 30 claude "/test-ascii --no-restart" || echo "Test completed or timed out"

echo ""
echo "=== Analysis ==="
echo "If Claude showed 'Unknown command: /test-ascii' - the CLI is parsing it as a command"
echo "If Claude executed the skill - the current approach should work"
echo "If Claude just showed the prompt but didn't process - we need stdin piping"
