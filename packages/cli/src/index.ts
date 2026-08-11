#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { render } from '@sculpt/core';
const [input, output = 'diagram.svg'] = process.argv.slice(2);
if (!input) { console.error('Usage: sculpt <input.mmd> [output.svg]'); process.exitCode = 1; } else { const source = readFileSync(input, 'utf8'); writeFileSync(output, render('diagram', source).svg, 'utf8'); }
