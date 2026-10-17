<script lang="ts">
  // Gerichts-Illustration als gecachtes Bild (statt Live-SVG im DOM)
  import type { Recipe } from '../core/types.ts';
  import { dishUrl } from '../art/art.ts';
  let { recipe, eager = false, alt = '' }: { recipe: Recipe; eager?: boolean; alt?: string } = $props();
</script>

<img src={dishUrl(recipe)} {alt} width="360" height="220" loading={eager ? 'eager' : 'lazy'} decoding="async" />

<style>
  img { display: block; width: 100%; height: 100%; object-fit: cover; }
</style>
