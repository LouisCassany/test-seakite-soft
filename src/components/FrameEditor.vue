<template>
    <div class="p-4 space-y-2 border-primary border">
        <h3 class="text-lg font-semibold text-gray-800">{{ name }}</h3>
        <div v-for="(field, index) in frame.templates" :key="field.var_name"
            class="flex items-center justify-between gap-4">
            <span class="w-1/2 font-medium text-gray-700">{{ field.var_name }}</span>
            <div class="flex items-center gap-1">
                <span class="text-sm text-gray-500">{{ field.type }}</span>
                <input type="number" v-model.number="model[field.var_name]" class="border px-2 py-1 w-32 rounded"
                    :disabled="index < 3 || index == frame.templates.length - 1"
                    :class="{ 'bg-gray-400': index < 3 || index == frame.templates.length - 1 }" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineProps, defineModel } from 'vue'
import { type Frame_template } from '../frame'

defineProps<{
    frame: Frame_template[string]
    name: string
}>()

const model = defineModel<Record<string, number>>({ required: true })

</script>