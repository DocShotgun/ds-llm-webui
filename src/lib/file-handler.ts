"use server";

import { MessageType } from "@/types/default";
import { promises as fs } from "fs";

export async function LoadConfig() {
  const file = await fs.readFile(
    process.cwd() + "/userdata/config.json",
    "utf8"
  );
  const data = JSON.parse(file);
  return data;
}

export async function LoadFunctions() {
  const file = await fs.readFile(
    process.cwd() + "/src/lib/functions.json",
    "utf8"
  );
  const data = JSON.parse(file);
  return data;
}

export async function LoadChat() {
  try {
    const file = await fs.readFile(
      process.cwd() + "/userdata/chat.json",
      "utf8"
    );
    const data = JSON.parse(file);
    return data;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      await fs.writeFile(process.cwd() + "/userdata/chat.json", "[]"); // create an empty chat log
    } else {
      console.error(`Error: ${err}`);
    }
    return [];
  }
}

export async function SaveChat(messages: MessageType[]) {
  fs.writeFile(
    process.cwd() + "/userdata/chat.json",
    JSON.stringify(messages, null, 2),
    "utf8"
  );
}
