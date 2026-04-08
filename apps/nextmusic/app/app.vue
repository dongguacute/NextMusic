<script setup lang="ts">
// 针对 iPad Safari 调试脚本注入导致的 null is not an object (evaluating 'instance.__vrv_devtools = info') 的修复
if (import.meta.client) {
  try {
    // 预先在全局原型上定义一个安全的属性访问器
    // 这样当外部脚本尝试在任何对象（甚至是即将被销毁或尚未完全初始化的对象）上设置 __vrv_devtools 时，都不会崩溃
    Object.defineProperty(Object.prototype, '__vrv_devtools', {
      set(v) {
        // 如果当前上下文是无效的，直接忽略，防止 instance.__vrv_devtools 报错
        if (!this) return;
        // 使用隐藏属性存储值，避免循环触发 setter
        (this as any)._vrv_storage = v;
      },
      get() {
        return (this as any)._vrv_storage;
      },
      configurable: true,
      enumerable: false
    });
  } catch (e) {
    console.warn('Failed to inject devtools shim', e);
  }
}
</script>

<template>
  <NuxtPage />
</template>
