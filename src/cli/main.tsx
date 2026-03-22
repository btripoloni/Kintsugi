import React, { useEffect, useState } from "react";
import "react/jsx-runtime";
import { Box, render, Spacer, Text, useApp } from "ink";
import { parseRunArgs, type RunArgs, runModlist } from "./commands/run.ts";
import { type CompileArgs, compileCommand, parseCompileArgs } from "./commands/compile.ts";

interface CliProps {
    args: string[];
}

function Help() {
    return (
        <Box flexDirection="column">
            <Text bold color="cyan">Kintsugi</Text>
            <Spacer />
            <Text>Usage:</Text>
            <Text color="gray">kintsugi &lt;command&gt; [options]</Text>
            <Spacer />
            <Text>Commands:</Text>
            <Text color="gray">compile Compile a recipe into a composition</Text>
            <Text color="gray">run Run a modlist</Text>
            <Spacer />
            <Text>Options:</Text>
            <Text color="gray">--help, -h Show this help message</Text>
            <Spacer />
            <Text>Examples:</Text>
            <Text color="gray">kintsugi compile myrecipe --store store --modlist ./modlist</Text>
            <Text color="gray">kintsugi run skyrim default</Text>
        </Box>
    );
}

function RunHelp() {
    return (
        <Box flexDirection="column">
            <Text bold color="cyan">Kintsugi Run</Text>
            <Spacer />
            <Text>Usage:</Text>
            <Text color="gray">
                kintsugi run &lt;modlist-name&gt; [profile] [--root &lt;kintsugi-root&gt;]
            </Text>
            <Spacer />
            <Text>Arguments:</Text>
            <Text color="gray">modlist-name Name of the modlist to run</Text>
            <Text color="gray">profile Execution profile (default: default)</Text>
            <Text color="gray">--root Kintsugi root directory (default: .kintsugi)</Text>
            <Text color="gray">--help, -h Show this help message</Text>
            <Spacer />
            <Text>Examples:</Text>
            <Text color="gray">kintsugi run skyrim default</Text>
            <Text color="gray">kintsugi run skyrim editor</Text>
            <Text color="gray">kintsugi run skyrim --root ~/.kintsugi</Text>
        </Box>
    );
}

function CompileHelp() {
    return (
        <Box flexDirection="column">
            <Text bold color="cyan">Kintsugi Compile</Text>
            <Spacer />
            <Text>Usage:</Text>
            <Text color="gray">
                kintsugi compile &lt;recipe-name&gt; --store &lt;store-dir&gt; --modlist
                &lt;modlist-dir&gt; --output &lt;output-dir&gt;
            </Text>
            <Spacer />
            <Text>Options:</Text>
            <Text color="gray">--store &lt;dir&gt; Store directory (default: store)</Text>
            <Text color="gray">--modlist &lt;dir&gt; Modlist root directory (default: .)</Text>
            <Text color="gray">--output &lt;dir&gt; Output directory (default: output)</Text>
            <Text color="gray">--help, -h Show this help message</Text>
        </Box>
    );
}

function App({ args }: CliProps) {
    const { exit } = useApp();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [output, setOutput] = useState<string | null>(null);

    const command = args[0];

    useEffect(() => {
        async function execute() {
            if (!command || command === "--help" || command === "-h") {
                return;
            }

            setLoading(true);

            try {
                if (command === "run") {
                    if (args.includes("--help") || args.includes("-h")) {
                        return;
                    }

                    const runArgs: RunArgs = parseRunArgs(args.slice(1));
                    setOutput(
                        `Running modlist '${runArgs.modlist}' with profile '${runArgs.profile}'...`,
                    );
                    await runModlist(runArgs);
                } else if (command === "compile") {
                    if (args.includes("--help") || args.includes("-h")) {
                        return;
                    }

                    const compileArgs: CompileArgs = parseCompileArgs(args.slice(1));
                    setOutput(`Compiling recipe '${compileArgs.recipeName}'...`);
                    await compileCommand(compileArgs);
                } else {
                    setError(`Unknown command: ${command}`);
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
            } finally {
                setLoading(false);
                exit();
            }
        }

        execute();
    }, [args, command, exit]);

    if (command === "--help" || command === "-h") {
        return <Help />;
    }

    if (command === "run" && (args.includes("--help") || args.includes("-h"))) {
        return <RunHelp />;
    }

    if (command === "compile" && (args.includes("--help") || args.includes("-h"))) {
        return <CompileHelp />;
    }

    if (!command) {
        return <Help />;
    }

    if (error) {
        return (
            <Box flexDirection="column">
                <Text color="red">{error}</Text>
                <Text color="gray">Run 'kintsugi --help' for usage information</Text>
            </Box>
        );
    }

    if (!command) {
        return <Help />;
    }

    if (command && !loading && output) {
        return (
            <Box flexDirection="column">
                <Text color="green">Done!</Text>
                {output && <Text>{output}</Text>}
            </Box>
        );
    }

    if (loading) {
        return (
            <Box flexDirection="column">
                <Text color="cyan">Kintsugi</Text>
                {output && <Text>{output}</Text>}
                <Text color="gray">Processing...</Text>
            </Box>
        );
    }

    return (
        <Box flexDirection="column">
            <Text color="green">Done!</Text>
            {output && <Text>{output}</Text>}
        </Box>
    );
}

const args = Deno.args;
const command = args[0];

const showHelp = args.includes("--help") || args.includes("-h");

async function main() {
    if (!command || command === "--help" || command === "-h") {
        const instance = await render(<Help />);
        await instance.waitUntilExit();
        Deno.exit(0);
    }

    if (command === "run") {
        if (showHelp) {
            const instance = await render(<RunHelp />);
            await instance.waitUntilExit();
            Deno.exit(0);
        }
    }

    if (command === "compile") {
        if (showHelp) {
            const instance = await render(<CompileHelp />);
            await instance.waitUntilExit();
            Deno.exit(0);
        }
    }

    const instance = await render(<App args={args.slice(1)} />);
    await instance.waitUntilExit();
}

main();
