"use server"

import { promises as fs } from 'fs';

export async function LoadConfig() {
  const file = await fs.readFile(process.cwd() + '/userdata/config.json', 'utf8');
  const data = JSON.parse(file);
  return data;
}

export async function LoadFunctions() {
  const file = await fs.readFile(process.cwd() + '/src/lib/functions.json', 'utf8');
  const data = JSON.parse(file);
  return data;
}

export async function LoadChat() {
  const file = await fs.readFile(process.cwd() + '/userdata/chat.json', 'utf8');
  const data = JSON.parse(file);
  return data;
}

export async function SaveChat(messages: Array<{ role: string ; content: string }>) {
  fs.writeFile(process.cwd() + '/userdata/chat.json', JSON.stringify(messages, null, 2), 'utf8')
}