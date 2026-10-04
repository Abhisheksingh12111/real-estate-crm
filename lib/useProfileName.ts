"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useProfileName() {
  const [name, setName] = useState("");

  useEffect(() => {
    let active = true;

    function load() {
      supabase
        .from("settings")
        .select("name")
        .eq("id", 1)
        .maybeSingle()
        .then(({ data }) => {
          if (active && data?.name) setName(data.name);
        });
    }

    load();
    window.addEventListener("profile-updated", load);

    return () => {
      active = false;
      window.removeEventListener("profile-updated", load);
    };
  }, []);

  return name;
}