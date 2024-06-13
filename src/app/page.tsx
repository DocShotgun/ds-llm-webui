"use client";

import React, { useState, useEffect } from "react";
import {
  Ban,
  CornerDownLeft,
  Mic,
  Moon,
  Paperclip,
  Settings2,
  Sun,
  Trash,
  Triangle,
  Wrench,
} from "lucide-react";
import { useTheme } from "next-themes";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";

import {
  LoadChat,
  LoadConfig,
  LoadFunctions,
  SaveChat,
} from "@/lib/file-handler";
import MessageBubble from "@/components/ui/message-bubble";
import tool_use from "@/lib/function-calling";
import {
  GenParams,
  GlobalConfig,
  MessageType,
  Tool,
  ToolStatus,
} from "@/types/default";
import infer_client from "@/lib/inference-client";
import parse_macros from "@/lib/prompter";
import { abort_exec, abort_init } from "@/lib/abort-client";
import { get_model_params } from "@/lib/api-tools";

export let globalConfig: GlobalConfig = {
  api_url: "http://127.0.0.1:5000", // default API URL
  max_seq_len: 16384, // default max sequence length
  system_prompt: "",
  system_prompt_parsed: "",
  response_prefix: "",
  newsfeed_rss_sources: [],
};
export let functionList: Tool[] = [];
let abortController = new AbortController();

export default function Home() {
  const { setTheme } = useTheme();
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [lastmessage, setLastMessage] = useState<MessageType[]>([]);

  //Gen param states
  const [genParams, setGenParams] = useState<GenParams>({
    max_tokens: 2048,
    temperature: 0.7,
    top_k: 0,
    top_p: 1,
    min_p: 0.1,
  });

  //Tool use states
  const [useTools, setUseTools] = useState(true);
  const [toolStatus, setToolStatus] = useState<ToolStatus>({
    directly_answer: true,
    web_search: true,
    grab_text: true,
    newsfeed: true,
    wolfram_alpha: true,
    pubmed_search: true,
  });

  useEffect(() => {
    const getConfig = async () => {
      globalConfig = await LoadConfig();
      try {
        const model_params = await get_model_params(
          globalConfig.api_url,
          globalConfig.api_key
        );
        globalConfig.max_seq_len = model_params.max_seq_len;
      } catch {}
      setGenParams({ ...genParams, ...globalConfig.default_samplers });
      setToolStatus({ ...toolStatus, ...globalConfig.default_tools });
    };
    const getFunctions = async () => {
      functionList = await LoadFunctions();
    };
    const getChatHistory = async () => {
      setMessages(await LoadChat());
    };
    getConfig();
    getFunctions();
    getChatHistory();
  }, []);

  useEffect(() => {
    const outputContainer = document.getElementById("outputContainer");
    if (outputContainer) {
      outputContainer.scrollTop = outputContainer.scrollHeight;
    }
  }, [messages, lastmessage]);

  useEffect(() => {
    const submitButton = document.getElementById("submitButton");
    const stopButton = document.getElementById("stopButton");
    if (submitButton && stopButton) {
      if (isGenerating) {
        submitButton.classList.add("hidden");
        stopButton.classList.remove("hidden");
      } else {
        submitButton.classList.remove("hidden");
        stopButton.classList.add("hidden");
      }
    }
  }, [isGenerating]);

  async function sendMessage(message: string) {
    const oldMessages = messages;
    try {
      globalConfig.system_prompt_parsed = parse_macros(
        globalConfig.system_prompt
      );
      let updatedMessages = [...messages, { role: "user", content: message }];
      setMessages(updatedMessages);
      let response = "";
      let tool_output;
      abortController.signal.throwIfAborted();
      if (useTools) {
        tool_output = await tool_use(
          updatedMessages,
          globalConfig,
          functionList,
          toolStatus
        );
      }
      abortController.signal.throwIfAborted();
      if (tool_output) {
        updatedMessages = [
          ...updatedMessages,
          { role: "system", content: tool_output },
        ];
        setMessages(updatedMessages);
        const responseGenerator = infer_client(
          updatedMessages,
          globalConfig,
          genParams,
          abortController.signal
        );
        for await (const chunk of responseGenerator) {
          response += chunk;
          setLastMessage([{ role: "assistant", content: response }]);
        }
      } else {
        const responseGenerator = infer_client(
          updatedMessages,
          globalConfig,
          genParams,
          abortController.signal
        );
        for await (const chunk of responseGenerator) {
          response += chunk;
          setLastMessage([{ role: "assistant", content: response }]);
        }
      }
      setLastMessage([]);
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: response },
      ]);
      SaveChat([...updatedMessages, { role: "assistant", content: response }]);
      setIsGenerating(false);
    } catch {
      console.log("Generation failed or aborted");
      setLastMessage([]);
      setMessages(oldMessages);
      SaveChat(oldMessages);
      setIsGenerating(false);
    }
  }

  const handleSubmit = () => {
    if (inputValue.length == 0) return;
    setIsGenerating(true);
    abortController = new AbortController();
    abort_init();
    sendMessage(inputValue);
    setInputValue("");
  };

  return (
    <div className="grid h-dvh w-full">
      <div className="flex flex-col h-dvh">
        <header className="sticky top-0 z-10 flex h-[57px] items-center gap-1 border-b bg-background px-4">
          <div>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Home"
                  className="mr-auto"
                >
                  <Triangle className="size-5 fill-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>DS LLM WebUI</DialogTitle>
                  <DialogDescription>
                    A simple tool-use assistant for local LLMs powered by
                    TabbyAPI.
                  </DialogDescription>
                </DialogHeader>
                <Separator className="my-2.5" />
                <div>
                  <p>
                    <a
                      href="https://github.com/DocShotgun/ds-llm-webui"
                      className="font-medium text-primary underline"
                    >
                      GitHub - DS LLM WebUI
                    </a>
                  </p>
                  <p>
                    <a
                      href="https://github.com/theroyallab/tabbyAPI"
                      className="font-medium text-primary underline"
                    >
                      GitHub - TabbyAPI
                    </a>
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="ml-auto space-x-2">
            <Drawer>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="ml-auto"
                  aria-label="Settings"
                >
                  <Settings2 className="size-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="mx-auto w-full max-w-lg">
                  <DrawerHeader>
                    <DrawerTitle>Inference Settings</DrawerTitle>
                    <DrawerDescription>
                      Configure LLM inference parameters
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="flex-col items-center justify-center">
                    <div className="flex py-5 items-center">
                      <Label htmlFor="max_tokens" className="w-1/4 px-2.5">
                        Max Tokens
                      </Label>
                      <Slider
                        value={[genParams.max_tokens]}
                        min={1}
                        max={globalConfig.max_seq_len}
                        step={1}
                        className="w-1/2"
                        onValueChange={(value) =>
                          setGenParams({ ...genParams, max_tokens: value[0] })
                        }
                      />
                      <Input
                        type="number"
                        value={genParams.max_tokens}
                        className="w-1/4 ml-2.5"
                        onChange={(event) => {
                          let value = parseInt(event.target.value);
                          if (value > globalConfig.max_seq_len)
                            value = globalConfig.max_seq_len;
                          if (value < 1) value = 1;
                          setGenParams({ ...genParams, max_tokens: value });
                        }}
                      />
                    </div>
                    <div className="flex py-5 items-center">
                      <Label htmlFor="temperature" className="w-1/4 px-2.5">
                        Temperature
                      </Label>
                      <Slider
                        value={[genParams.temperature]}
                        min={0}
                        max={5}
                        step={0.05}
                        className="w-1/2"
                        onValueChange={(value) =>
                          setGenParams({ ...genParams, temperature: value[0] })
                        }
                      />
                      <Input
                        type="number"
                        value={genParams.temperature}
                        step={0.05}
                        className="w-1/4 ml-2.5"
                        onChange={(event) => {
                          let value = parseFloat(event.target.value);
                          if (value > 5) value = 5;
                          if (value < 0) value = 0;
                          setGenParams({ ...genParams, temperature: value });
                        }}
                      />
                    </div>
                    <div className="flex py-5 items-center">
                      <Label htmlFor="topk" className="w-1/4 px-2.5">
                        Top-K
                      </Label>
                      <Slider
                        value={[genParams.top_k]}
                        min={0}
                        max={200}
                        step={1}
                        className="w-1/2"
                        onValueChange={(value) =>
                          setGenParams({ ...genParams, top_k: value[0] })
                        }
                      />
                      <Input
                        type="number"
                        value={genParams.top_k}
                        className="w-1/4 ml-2.5"
                        onChange={(event) => {
                          let value = parseInt(event.target.value);
                          if (value > 200) value = 200;
                          if (value < 0) value = 0;
                          setGenParams({ ...genParams, top_k: value });
                        }}
                      />
                    </div>
                    <div className="flex py-5">
                      <Label htmlFor="topp" className="w-1/4 px-2.5">
                        Top-P
                      </Label>
                      <Slider
                        value={[genParams.top_p]}
                        min={0}
                        max={1}
                        step={0.01}
                        className="w-1/2"
                        onValueChange={(value) =>
                          setGenParams({ ...genParams, top_p: value[0] })
                        }
                      />
                      <Input
                        type="number"
                        value={genParams.top_p}
                        step={0.01}
                        className="w-1/4 ml-2.5"
                        onChange={(event) => {
                          let value = parseFloat(event.target.value);
                          if (value > 1) value = 1;
                          if (value < 0) value = 0;
                          setGenParams({ ...genParams, top_p: value });
                        }}
                      />
                    </div>
                    <div className="flex py-5">
                      <Label htmlFor="minp" className="w-1/4 px-2.5">
                        Min-P
                      </Label>
                      <Slider
                        value={[genParams.min_p]}
                        min={0}
                        max={1}
                        step={0.01}
                        className="w-1/2"
                        onValueChange={(value) =>
                          setGenParams({ ...genParams, min_p: value[0] })
                        }
                      />
                      <Input
                        type="number"
                        value={genParams.min_p}
                        step={0.01}
                        className="w-1/4 ml-2.5"
                        onChange={(event) => {
                          let value = parseFloat(event.target.value);
                          if (value > 1) value = 1;
                          if (value < 0) value = 0;
                          setGenParams({ ...genParams, min_p: value });
                        }}
                      />
                    </div>
                  </div>
                  <DrawerFooter>
                    <DrawerClose asChild>
                      <Button variant="outline">Close</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
            <Drawer>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="ml-auto"
                  aria-label="Tool Use"
                >
                  <Wrench className="size-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="mx-auto w-full max-w-lg">
                  <DrawerHeader>
                    <DrawerTitle>Tool Use Settings</DrawerTitle>
                    <DrawerDescription>
                      Configure assistant function-calling settings
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="flex-col items-center justify-center">
                    <div className="flex py-5">
                      <Label htmlFor="tool-use" className="w-1/2 px-2.5">
                        Tool Use
                      </Label>
                      <Switch
                        className="ml-auto"
                        checked={useTools}
                        onCheckedChange={(checked) => {
                          setUseTools(checked);
                        }}
                      />
                    </div>
                    <Separator className="my-2.5" />
                    <div className="flex py-5">
                      <Label htmlFor="web-search" className="w-1/2 px-2.5">
                        Internet Search
                      </Label>
                      <Switch
                        className="ml-auto"
                        checked={toolStatus.web_search}
                        disabled={!useTools}
                        onCheckedChange={(checked) => {
                          setToolStatus({ ...toolStatus, web_search: checked });
                        }}
                      />
                    </div>
                    <div className="flex py-5">
                      <Label htmlFor="grab-text" className="w-1/2 px-2.5">
                        Website Scrape
                      </Label>
                      <Switch
                        className="ml-auto"
                        checked={toolStatus.grab_text}
                        disabled={!useTools}
                        onCheckedChange={(checked) => {
                          setToolStatus({ ...toolStatus, grab_text: checked });
                        }}
                      />
                    </div>
                    <div className="flex py-5">
                      <Label htmlFor="newsfeed" className="w-1/2 px-2.5">
                        Newsfeed Search
                      </Label>
                      <Switch
                        className="ml-auto"
                        checked={toolStatus.newsfeed}
                        disabled={!useTools}
                        onCheckedChange={(checked) => {
                          setToolStatus({ ...toolStatus, newsfeed: checked });
                        }}
                      />
                    </div>
                    <div className="flex py-5">
                      <Label htmlFor="wolfram-alpha" className="w-1/2 px-2.5">
                        Wolfram Alpha
                      </Label>
                      <Switch
                        className="ml-auto"
                        checked={toolStatus.wolfram_alpha}
                        disabled={!useTools}
                        onCheckedChange={(checked) => {
                          setToolStatus({
                            ...toolStatus,
                            wolfram_alpha: checked,
                          });
                        }}
                      />
                    </div>
                    <div className="flex py-5">
                      <Label htmlFor="pubmed-search" className="w-1/2 px-2.5">
                        PubMed
                      </Label>
                      <Switch
                        className="ml-auto"
                        checked={toolStatus.pubmed_search}
                        disabled={!useTools}
                        onCheckedChange={(checked) => {
                          setToolStatus({
                            ...toolStatus,
                            pubmed_search: checked,
                          });
                        }}
                      />
                    </div>
                  </div>
                  <DrawerFooter>
                    <DrawerClose asChild>
                      <Button variant="outline">Close</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="ml-auto">
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="grid flex-1 gap-4 overflow-auto p-4 md:grid-cols-2">
          <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl bg-muted/50 p-4 lg:col-span-2">
            <div id="outputContainer" className="output-container mb-5">
              {messages.map((messageObj) => (
                <MessageBubble key={messageObj.content} {...messageObj} />
              ))}
              {lastmessage.map((messageObj) => (
                <MessageBubble key={messageObj.content} {...messageObj} />
              ))}
            </div>
            <form
              className="relative overflow-hidden rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring"
              x-chunk="dashboard-03-chunk-1"
            >
              <Label htmlFor="message" className="sr-only">
                Message
              </Label>
              <Textarea
                placeholder="Type your message here..."
                value={inputValue}
                className="min-h-12 resize-none border-0 p-2.5 shadow-none focus-visible:ring-0"
                disabled={isGenerating}
                onChange={(event) => {
                  setInputValue(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    handleSubmit();
                  }
                }}
              />
              <div className="flex items-center p-2.5 justify-between">
                <div className="space-x-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="hidden">
                        <Paperclip className="size-4" />
                        <span className="sr-only">Attach file</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Attach File</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="hidden">
                        <Mic className="size-4" />
                        <span className="sr-only">Use Microphone</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Use Microphone</TooltipContent>
                  </Tooltip>
                </div>
                <div className="space-x-2">
                  <Button
                    id="submitButton"
                    type="button"
                    size="icon"
                    className="ml-auto"
                    disabled={isGenerating}
                    onClick={handleSubmit}
                  >
                    <CornerDownLeft className="ml-auto mr-auto size-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                  <Button
                    id="stopButton"
                    type="button"
                    size="icon"
                    className="ml-auto hidden"
                    disabled={!isGenerating}
                    onClick={() => {
                      abortController.abort();
                      abort_exec();
                    }}
                  >
                    <Ban className="ml-auto mr-auto size-4" />
                    <span className="sr-only">Stop</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="ml-auto gap-1.5"
                        disabled={isGenerating}
                      >
                        <Trash className="ml-auto mr-auto size-4" />
                        <span className="sr-only">Clear</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          clear the current chat history.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            setMessages([]);
                            setLastMessage([]);
                            SaveChat([]);
                          }}
                        >
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
