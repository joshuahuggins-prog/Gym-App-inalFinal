// src/pages/ExercisesPage.js
import React, { useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Trash2, Search, Save, Video, RotateCcw } from "lucide-react";

import AppHeader from "../components/AppHeader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

import {
  getExercises,
  saveExercise,
  deleteExercise,
  getProgrammes,
  getVideoLinks,
  updateVideoLink,
  getDefaultVideoLinks,
} from "../utils/storage";

import { toast } from "sonner";

/* ================= helpers ================= */
const MAX_SETS = 8;
const clampInt = (n, min, max) => Math.max(min, Math.min(max, n));
const norm = (s) => String(s || "").trim().toLowerCase();

/* ============== math challenge ============== */
const randInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const makeChallenge = () => {
  const ops = ["+", "-", "*"];
  const op = ops[randInt(0, ops.length - 1)];
  let a = randInt(1, 99);
  let b = randInt(1, 99);

  if (op === "*") {
    a = randInt(1, 12);
    b = randInt(1, 12);
  }
  if (op === "-" && b > a) [a, b] = [b, a];

  const result =
    op === "+" ? a + b : op === "-" ? a - b : a * b;

  return { text: `${a} ${op} ${b}`, result };
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProgramme, setFilterProgramme] = useState("all");

  const [editingExercise, setEditingExercise] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [setsDraft, setSetsDraft] = useState("");

  const [resetOpenId, setResetOpenId] = useState("");
  const [resetChallenge, setResetChallenge] = useState(makeChallenge);
  const [resetAnswer, setResetAnswer] = useState("");

  useEffect(() => {
    setExercises(getExercises() || []);
    setProgrammes(getProgrammes() || []);
  }, []);

  /* ===== defaults map ===== */
  const defaultExerciseMap = useMemo(() => {
    try {
      const { WORKOUT_A, WORKOUT_B } = require("../data/workoutData");
      const all = [...(WORKOUT_A?.exercises || []), ...(WORKOUT_B?.exercises || [])];
      const map = new Map();
      all.forEach((ex) => map.set(ex.id, ex));
      return map;
    } catch {
      return new Map();
    }
  }, []);

  const filteredExercises = useMemo(() => {
    const search = searchTerm.toLowerCase();
    let allowedIds = null;

    if (filterProgramme !== "all") {
      const prog = programmes.find((p) => p.type === filterProgramme);
      allowedIds = new Set((prog?.exercises || []).map((e) => norm(e.id)));
    }

    return exercises.filter((ex) => {
      const matchesSearch = !search || ex.name.toLowerCase().includes(search);
      const matchesProgramme =
        filterProgramme === "all" || allowedIds?.has(norm(ex.id));
      return matchesSearch && matchesProgramme;
    });
  }, [exercises, programmes, searchTerm, filterProgramme]);

  /* ================= render ================= */
  return (
    <AppHeader
      title="Exercises"
      subtitle={`${exercises.length} total exercises`}
      rightIconSrc="/icons/icon-overlay-white-32-v1.png"
    >
      {/* Header actions */}
      <div className="flex gap-3 px-4 pb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search exercises…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={filterProgramme} onValueChange={setFilterProgramme}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programmes</SelectItem>
            {programmes.map((p) => (
              <SelectItem key={p.type} value={p.type}>
                {p.name || p.type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={() => setShowEditDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New
        </Button>
      </div>

      {/* Page content */}
      <div className="px-4 py-4 space-y-4">
        {filteredExercises.map((exercise) => (
          <div
            key={exercise.id}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-lg">{exercise.name}</div>
                <Badge variant="outline" className="mt-1">
                  {exercise.repScheme}
                </Badge>
              </div>

              <div className="flex gap-1">
                <Button variant="ghost" size="sm">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit dialog stays unchanged */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create / Edit Exercise</DialogTitle>
          </DialogHeader>
          {/* existing dialog content stays */}
        </DialogContent>
      </Dialog>
    </AppHeader>
  );
}