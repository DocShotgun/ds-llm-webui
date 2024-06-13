"use client";

export async function abort_init() {
  fetch("/api/abort/init");
}

export async function abort_exec() {
  fetch("/api/abort/exec");
}
