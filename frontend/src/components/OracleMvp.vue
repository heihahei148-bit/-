<template>
  <main class="min-h-screen">
    <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <header class="border border-white/10 bg-black/35 p-4 shadow-soft sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-[11px] uppercase tracking-[0.32em] text-amber-200/70">
              AI Bingjian
            </p>
            <h1 class="mt-3 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              AI 冰鉴神相
            </h1>
            <p class="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
              填写姓名和出生年月日，上传清晰的人脸与手掌照片。系统会先检查照片类型和清晰度，再生成白话版测算结果。
            </p>
          </div>

          <div class="border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-xs leading-6 text-zinc-400">
            <div class="flex items-center gap-2 text-amber-100">
              <ScrollText class="h-4 w-4" />
              <span>仅供文化娱乐参考</span>
            </div>
            <p class="mt-1">当前为 3 秒 Mock 测算，照片识别在浏览器内完成。</p>
          </div>
        </div>
      </header>

      <section class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]">
        <form
          class="border border-white/10 bg-zinc-950/75 p-4 shadow-soft sm:p-5"
          @submit.prevent="submit"
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs text-zinc-400" for="name">姓名</label>
              <div class="flex items-center gap-3 border border-white/10 bg-black/30 px-3 py-3">
                <UserRound class="h-4 w-4 shrink-0 text-amber-200/80" />
                <input
                  id="name"
                  v-model="name"
                  type="text"
                  autocomplete="off"
                  placeholder="请输入姓名"
                  class="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                  :disabled="loading"
                />
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-xs text-zinc-400" for="birthDate">出生年月日</label>
              <div class="flex items-center gap-3 border border-white/10 bg-black/30 px-3 py-3">
                <CalendarDays class="h-4 w-4 shrink-0 text-emerald-200/80" />
                <input
                  id="birthDate"
                  v-model="birthDate"
                  type="date"
                  class="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none [color-scheme:dark]"
                  :disabled="loading"
                />
              </div>
            </div>
          </div>

          <div class="mt-5 grid gap-4 lg:grid-cols-2">
            <section class="space-y-2">
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs text-zinc-400">面部照片</p>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-xs text-amber-100/80 hover:text-amber-100"
                  :disabled="loading"
                  @click="triggerPicker('face')"
                >
                  <Upload class="h-3.5 w-3.5" />
                  重新上传
                </button>
              </div>

              <button
                type="button"
                class="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden border border-dashed bg-black/30 text-left transition hover:bg-black/45"
                :class="uploadBorderClass(faceAudit.state, 'face')"
                :disabled="loading"
                @click="triggerPicker('face')"
              >
                <img
                  v-if="facePreview"
                  :src="facePreview"
                  alt="面部照片预览"
                  class="absolute inset-0 h-full w-full object-cover"
                />
                <div v-else class="flex flex-col items-center gap-2 px-4 text-center text-zinc-500">
                  <ScanFace class="h-8 w-8 text-amber-200/70" />
                  <span class="text-sm text-zinc-300">上传清晰正脸照片</span>
                  <span class="text-xs text-zinc-600">脸部完整、光线充足、不要太糊</span>
                </div>
                <div
                  v-if="facePreview"
                  class="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-xs text-zinc-200"
                >
                  <p class="truncate">{{ faceFile?.name }}</p>
                </div>
              </button>

              <div class="space-y-1">
                <div
                  class="inline-flex max-w-full items-center gap-2 border px-2 py-1 text-xs"
                  :class="badgeClass(faceAudit.state)"
                >
                  <LoaderCircle v-if="faceAudit.state === 'checking'" class="h-3.5 w-3.5 animate-spin" />
                  <CheckCircle2 v-else-if="faceAudit.state === 'ok'" class="h-3.5 w-3.5" />
                  <AlertTriangle v-else-if="faceAudit.state === 'error'" class="h-3.5 w-3.5" />
                  <Upload v-else class="h-3.5 w-3.5" />
                  <span class="truncate">{{ faceAudit.message }}</span>
                </div>
                <p v-if="faceAudit.detail" class="text-xs leading-5 text-zinc-500">
                  {{ faceAudit.detail }}
                </p>
              </div>

              <input
                ref="faceInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onFileChange('face', $event)"
              />
            </section>

            <section class="space-y-2">
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs text-zinc-400">手掌照片</p>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-xs text-cyan-100/80 hover:text-cyan-100"
                  :disabled="loading"
                  @click="triggerPicker('palm')"
                >
                  <Upload class="h-3.5 w-3.5" />
                  重新上传
                </button>
              </div>

              <button
                type="button"
                class="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden border border-dashed bg-black/30 text-left transition hover:bg-black/45"
                :class="uploadBorderClass(palmAudit.state, 'palm')"
                :disabled="loading"
                @click="triggerPicker('palm')"
              >
                <img
                  v-if="palmPreview"
                  :src="palmPreview"
                  alt="手掌照片预览"
                  class="absolute inset-0 h-full w-full object-cover"
                />
                <div v-else class="flex flex-col items-center gap-2 px-4 text-center text-zinc-500">
                  <Hand class="h-8 w-8 text-cyan-200/70" />
                  <span class="text-sm text-zinc-300">上传清晰手掌照片</span>
                  <span class="text-xs text-zinc-600">掌心朝向镜头，手掌尽量完整</span>
                </div>
                <div
                  v-if="palmPreview"
                  class="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-xs text-zinc-200"
                >
                  <p class="truncate">{{ palmFile?.name }}</p>
                </div>
              </button>

              <div class="space-y-1">
                <div
                  class="inline-flex max-w-full items-center gap-2 border px-2 py-1 text-xs"
                  :class="badgeClass(palmAudit.state)"
                >
                  <LoaderCircle v-if="palmAudit.state === 'checking'" class="h-3.5 w-3.5 animate-spin" />
                  <CheckCircle2 v-else-if="palmAudit.state === 'ok'" class="h-3.5 w-3.5" />
                  <AlertTriangle v-else-if="palmAudit.state === 'error'" class="h-3.5 w-3.5" />
                  <Upload v-else class="h-3.5 w-3.5" />
                  <span class="truncate">{{ palmAudit.message }}</span>
                </div>
                <p v-if="palmAudit.detail" class="text-xs leading-5 text-zinc-500">
                  {{ palmAudit.detail }}
                </p>
              </div>

              <input
                ref="palmInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onFileChange('palm', $event)"
              />
            </section>
          </div>

          <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              :disabled="!canSubmit"
              class="inline-flex w-full items-center justify-center gap-2 border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-sm font-medium text-amber-100 transition hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin" />
              <Compass v-else class="h-4 w-4" />
              <span>{{ loading ? '测算中...' : '开始天机测算' }}</span>
            </button>

            <button
              type="button"
              class="inline-flex w-full items-center justify-center gap-2 border border-white/10 bg-black/25 px-4 py-3 text-sm text-zinc-300 transition hover:border-white/20 hover:bg-black/40 sm:w-auto"
              :disabled="loading"
              @click="resetForm"
            >
              <RotateCcw class="h-4 w-4" />
              <span>重置输入</span>
            </button>
          </div>

          <p v-if="error" class="mt-4 border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {{ error }}
          </p>
        </form>

        <aside class="border border-white/10 bg-black/25 p-4 shadow-soft sm:p-5">
          <div class="flex items-center gap-2 text-sm text-amber-100">
            <Sparkles class="h-4 w-4" />
            <span>提交前检查</span>
          </div>

          <dl class="mt-4 space-y-3 text-sm">
            <div class="flex items-start justify-between gap-4 border-b border-white/5 pb-3">
              <dt class="text-zinc-500">姓名</dt>
              <dd class="max-w-[62%] break-words text-right text-zinc-200">
                {{ name || '未填写' }}
              </dd>
            </div>
            <div class="flex items-start justify-between gap-4 border-b border-white/5 pb-3">
              <dt class="text-zinc-500">出生日期</dt>
              <dd class="max-w-[62%] break-words text-right text-zinc-200">
                {{ birthDate || '未填写' }}
              </dd>
            </div>
            <div class="border-b border-white/5 pb-3">
              <dt class="text-zinc-500">面部照片</dt>
              <dd class="mt-2 text-zinc-200">
                <span class="block break-words text-xs text-zinc-500">{{ faceFile?.name || '未上传' }}</span>
                <span class="mt-2 inline-flex border px-2 py-1 text-xs" :class="badgeClass(faceAudit.state)">
                  {{ faceAudit.message }}
                </span>
              </dd>
            </div>
            <div class="border-b border-white/5 pb-3">
              <dt class="text-zinc-500">手掌照片</dt>
              <dd class="mt-2 text-zinc-200">
                <span class="block break-words text-xs text-zinc-500">{{ palmFile?.name || '未上传' }}</span>
                <span class="mt-2 inline-flex border px-2 py-1 text-xs" :class="badgeClass(palmAudit.state)">
                  {{ palmAudit.message }}
                </span>
              </dd>
            </div>
            <div class="flex items-start justify-between gap-4">
              <dt class="text-zinc-500">状态</dt>
              <dd class="max-w-[62%] text-right text-zinc-200">
                {{ canSubmit ? '可以测算' : '请先完成信息和照片检查' }}
              </dd>
            </div>
          </dl>
        </aside>
      </section>

      <section v-if="report" class="mt-6 space-y-5">
        <div class="border border-emerald-300/15 bg-emerald-300/5 px-4 py-3 text-sm text-emerald-100">
          测算完成 · 用时 {{ report.meta.elapsedMs }} ms
        </div>

        <div class="grid gap-5 lg:grid-cols-2">
          <article class="border border-white/10 bg-zinc-950/75 p-4 shadow-soft sm:p-5 lg:col-span-2">
            <div class="flex items-center gap-2 text-sm text-amber-100">
              <ScrollText class="h-4 w-4" />
              <h2 class="font-medium">八字说明</h2>
            </div>
            <p class="mt-3 text-sm leading-7 text-zinc-300">
              {{ report.bazi.summaryText }}
            </p>

            <div class="mt-4 grid gap-3 sm:grid-cols-3">
              <div
                v-for="pillar in report.bazi.pillars"
                :key="pillar.label"
                class="border border-white/10 bg-black/30 p-4"
              >
                <p class="text-xs text-zinc-500">{{ pillar.label }}</p>
                <p class="mt-2 text-base font-medium text-amber-100">{{ pillar.value }}</p>
                <p class="mt-2 text-xs leading-6 text-zinc-500">{{ pillar.note }}</p>
              </div>
            </div>
          </article>

          <article class="border border-white/10 bg-zinc-950/75 p-4 shadow-soft sm:p-5">
            <div class="flex items-center gap-2 text-sm text-cyan-100">
              <ScanFace class="h-4 w-4" />
              <h2 class="font-medium">面相说明</h2>
            </div>
            <p class="mt-3 text-sm leading-7 text-zinc-400">
              {{ report.faceAnalysis.overview }}
            </p>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <div
                v-for="item in report.faceAnalysis.items"
                :key="item.label"
                class="border border-white/10 bg-black/30 p-4"
              >
                <p class="text-xs text-zinc-500">{{ item.label }}</p>
                <p class="mt-2 text-sm leading-7 text-zinc-200">{{ item.value }}</p>
              </div>
            </div>
          </article>

          <article class="border border-white/10 bg-zinc-950/75 p-4 shadow-soft sm:p-5">
            <div class="flex items-center gap-2 text-sm text-cyan-100">
              <Hand class="h-4 w-4" />
              <h2 class="font-medium">手掌说明</h2>
            </div>
            <p class="mt-3 text-sm leading-7 text-zinc-400">
              {{ report.palmAnalysis.overview }}
            </p>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <div
                v-for="item in report.palmAnalysis.items"
                :key="item.label"
                class="border border-white/10 bg-black/30 p-4"
              >
                <p class="text-xs text-zinc-500">{{ item.label }}</p>
                <p class="mt-2 text-sm leading-7 text-zinc-200">{{ item.value }}</p>
              </div>
            </div>
          </article>

          <article class="border border-white/10 bg-zinc-950/75 p-4 shadow-soft sm:p-5 lg:col-span-2">
            <div class="flex items-center gap-2 text-sm text-amber-100">
              <Sparkles class="h-4 w-4" />
              <h2 class="font-medium">一句话建议</h2>
            </div>
            <p class="mt-3 text-sm leading-8 text-zinc-200">
              {{ report.summary }}
            </p>
            <p class="mt-4 text-xs leading-6 text-zinc-500">
              {{ report.confidenceNote }}
            </p>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Compass,
  Hand,
  LoaderCircle,
  RotateCcw,
  ScanFace,
  ScrollText,
  Sparkles,
  Upload,
  UserRound
} from 'lucide-vue-next';
import { auditPhoto } from '../utils/imageAudit.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const name = ref('');
const birthDate = ref('');
const faceFile = ref(null);
const palmFile = ref(null);
const facePreview = ref('');
const palmPreview = ref('');
const faceInput = ref(null);
const palmInput = ref(null);
const faceAudit = ref(makeAudit('请上传人脸照片'));
const palmAudit = ref(makeAudit('请上传手掌照片'));
const loading = ref(false);
const error = ref('');
const report = ref(null);
const validationTokens = {
  face: 0,
  palm: 0
};

const canSubmit = computed(() => {
  return Boolean(
    name.value.trim() &&
      birthDate.value &&
      faceFile.value &&
      palmFile.value &&
      faceAudit.value.ok &&
      palmAudit.value.ok &&
      !loading.value
  );
});

function makeAudit(message) {
  return {
    ok: false,
    state: 'idle',
    message,
    detail: '',
    width: null,
    height: null,
    sharpness: null,
    score: null
  };
}

function revokePreview(previewRef) {
  if (previewRef.value) {
    URL.revokeObjectURL(previewRef.value);
    previewRef.value = '';
  }
}

function triggerPicker(kind) {
  if (loading.value) return;
  if (kind === 'face') {
    faceInput.value?.click();
  } else {
    palmInput.value?.click();
  }
}

async function onFileChange(kind, event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  const token = ++validationTokens[kind];
  error.value = '';
  report.value = null;

  if (kind === 'face') {
    revokePreview(facePreview);
    faceFile.value = file;
    facePreview.value = URL.createObjectURL(file);
    faceAudit.value = { ...makeAudit('正在识别人脸和清晰度...'), state: 'checking' };
  } else {
    revokePreview(palmPreview);
    palmFile.value = file;
    palmPreview.value = URL.createObjectURL(file);
    palmAudit.value = { ...makeAudit('正在识别手掌和清晰度...'), state: 'checking' };
  }

  const result = await auditPhoto(file, kind);
  if (token !== validationTokens[kind]) {
    return;
  }

  const nextAudit = {
    ...makeAudit(result.message),
    ok: result.ok,
    state: result.ok ? 'ok' : 'error',
    message: result.message,
    detail: result.ok
      ? `${result.width} x ${result.height} · 清晰度 ${Math.round(result.sharpness)} · 置信度 ${Math.round(
          result.score * 100
        )}%`
      : '',
    width: result.width,
    height: result.height,
    sharpness: result.sharpness,
    score: result.score
  };

  if (kind === 'face') {
    faceAudit.value = nextAudit;
  } else {
    palmAudit.value = nextAudit;
  }
}

function resetForm() {
  validationTokens.face += 1;
  validationTokens.palm += 1;
  name.value = '';
  birthDate.value = '';
  faceFile.value = null;
  palmFile.value = null;
  revokePreview(facePreview);
  revokePreview(palmPreview);
  faceAudit.value = makeAudit('请上传人脸照片');
  palmAudit.value = makeAudit('请上传手掌照片');
  error.value = '';
  report.value = null;
}

function badgeClass(state) {
  if (state === 'ok') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
  if (state === 'error') return 'border-red-300/25 bg-red-300/10 text-red-100';
  if (state === 'checking') return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  return 'border-white/10 bg-black/20 text-zinc-500';
}

function uploadBorderClass(state, kind) {
  if (state === 'ok') return 'border-emerald-300/40';
  if (state === 'error') return 'border-red-300/50';
  if (state === 'checking') return 'border-amber-300/40';
  return kind === 'face' ? 'border-amber-300/20 hover:border-amber-200/60' : 'border-cyan-300/20 hover:border-cyan-200/60';
}

async function submit() {
  if (!canSubmit.value) {
    error.value = '请先填写姓名和出生日期，并确保两张照片都通过检查。';
    return;
  }

  loading.value = true;
  error.value = '';
  report.value = null;

  try {
    const formData = new FormData();
    formData.append('name', name.value.trim());
    formData.append('birthDate', birthDate.value);
    formData.append('faceImage', faceFile.value);
    formData.append('palmImage', palmFile.value);
    formData.append('faceAudit', JSON.stringify(faceAudit.value));
    formData.append('palmAudit', JSON.stringify(palmAudit.value));

    const response = await fetch(`${API_BASE}/api/calculate`, {
      method: 'POST',
      body: formData
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || '测算失败，请稍后重试。');
    }

    report.value = payload.data;
  } catch (err) {
    error.value = err?.message || '测算失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
}

onBeforeUnmount(() => {
  revokePreview(facePreview);
  revokePreview(palmPreview);
});
</script>
