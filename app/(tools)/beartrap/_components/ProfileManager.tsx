"use client";

import type { BearTrapProfile } from "@/app/_shared/types";
import { useEffect, useRef, useState } from "react";

export const MAX_PROFILES = 5;

interface ProfileManagerProps {
  profiles: BearTrapProfile[];
  activeProfileId: string | null;
  hasUnsavedChanges: boolean;
  onSwitch: (id: string) => void;
  onSave: () => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function ProfileManager({
  profiles,
  activeProfileId,
  hasUnsavedChanges,
  onSwitch,
  onSave,
  onNew,
  onDuplicate,
  onRename,
  onDelete,
}: ProfileManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when rename mode starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startRename = (profile: BearTrapProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(profile.id);
    setEditingName(profile.name);
  };

  const commitRename = () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (trimmed) onRename(editingId, trimmed);
    setEditingId(null);
  };

  const handleRenameKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") setEditingId(null);
  };

  const handleDelete = (profile: BearTrapProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete profile "${profile.name}"? This cannot be undone.`)) {
      onDelete(profile.id);
    }
  };

  const atLimit = profiles.length >= MAX_PROFILES;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-white/3 border border-white/8 rounded-xl mb-4">
      {/* Label */}
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide shrink-0 mr-1">
        Profiles
      </span>

      {/* Profile tabs */}
      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
        {profiles.map((p) => {
          const isActive = p.id === activeProfileId;
          return (
            <div
              key={p.id}
              onClick={() => onSwitch(p.id)}
              className={`group flex items-center gap-1 rounded-lg border px-2.5 py-1 cursor-pointer transition-all text-xs font-medium ${
                isActive
                  ? "border-kingshot-gold-500/60 bg-kingshot-gold-500/10 text-kingshot-gold-400"
                  : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-300"
              }`}
            >
              {editingId === p.id ? (
                <input
                  ref={inputRef}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleRenameKey}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent outline-none w-24 text-xs"
                  maxLength={20}
                />
              ) : (
                <>
                  <span className="max-w-30 truncate">{p.name}</span>
                  {/* Rename pencil — only on active or hover */}
                  <button
                    onClick={(e) => startRename(p, e)}
                    title="Rename"
                    className={`transition-opacity ${isActive ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-60 hover:opacity-100!"}`}
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                  {/* Duplicate — hidden when at limit */}
                  {!atLimit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(p.id);
                      }}
                      title="Duplicate profile"
                      className={`transition-opacity ${isActive ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-60 hover:opacity-100!"}`}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  )}
                  {/* Delete ×  — only when >1 profile */}
                  {profiles.length > 1 && (
                    <button
                      onClick={(e) => handleDelete(p, e)}
                      title="Delete profile"
                      className={`transition-opacity ${isActive ? "opacity-40 hover:opacity-100 hover:text-red-400" : "opacity-0 group-hover:opacity-40 hover:opacity-100! hover:text-red-400"}`}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Right-side actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Unsaved indicator + Save button */}
        {hasUnsavedChanges && (
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 rounded-lg border border-kingshot-gold-500/50 bg-kingshot-gold-500/10 px-2.5 py-1 text-xs font-semibold text-kingshot-gold-400 hover:bg-kingshot-gold-500/20 transition-all"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            Save
          </button>
        )}

        {/* New profile */}
        <button
          onClick={onNew}
          disabled={atLimit}
          title={atLimit ? `Maximum ${MAX_PROFILES} profiles` : "New profile"}
          className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-400 hover:border-white/20 hover:text-gray-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New
          {atLimit && (
            <span className="text-[10px] opacity-60">({MAX_PROFILES} max)</span>
          )}
        </button>
      </div>
    </div>
  );
}
