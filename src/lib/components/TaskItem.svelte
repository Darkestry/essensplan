<script lang="ts">
  import type { Task } from '../core/types.ts';
  import { setTaskDone, taskDone } from '../core/prep.ts';
  import { relDay } from '../core/util.ts';
  import { buzz } from '../ui.svelte.ts';
  /** date: Tag der Ansicht – weicht die Aufgabe ab, wird der Tag mit angezeigt */
  let { task, date = '' }: { task: Task; date?: string } = $props();
  const done = $derived(taskDone(task.id, task.date));
  const id = $derived('t-' + task.id);
</script>

<li class="task" class:done>
  <input type="checkbox" {id} checked={done} onchange={e => { setTaskDone(task.id, task.date, e.currentTarget.checked); buzz(8); }} />
  <label for={id}>
    <span class="when">{date && task.date !== date ? relDay(task.date) + ', ' : ''}{task.when}</span>
    <b>{task.title}</b>
    <span>{task.detail}</span>
    {#if task.recipe}<a href="#/r/{task.recipe}" class="linkbtn">Zum Rezept</a>{/if}
  </label>
</li>
