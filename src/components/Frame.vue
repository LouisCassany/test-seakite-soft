<template>
    <div class="space-y-4 p-4">
        <div v-for="field in frameTemplate" :key="field.var_name" class="flex items-center gap-4">
            <label :for="field.var_name" class="w-1/4 font-semibold text-gray-700">
                {{ field.var_name }}
            </label>
            <input :id="field.var_name" type="number" v-model.number="formValues[field.var_name]"
                :disabled="isFieldDisabled(field.var_name)" :class="[
                    'border px-2 py-1 rounded w-32',
                    isFieldDisabled(field.var_name) ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                ]" />
            <span class="text-sm text-gray-500">
                {{ field.type }}
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineProps, reactive, watchEffect } from 'vue'

interface FrameField {
    var_name: string
    size: number
    position: number
    type: string
}

const props = defineProps<{
    frameTemplate: FrameField[]
}>()

const formValues = reactive<Record<string, number>>({})

// Initialize form values if not already set
watchEffect(() => {
    props.frameTemplate.forEach((field) => {
        if (!(field.var_name in formValues)) {
            formValues[field.var_name] = 0
        }
    })
})

// Disable these specific fields
function isFieldDisabled(name: string) {
    return ["PRE", "ID", "LEN", "CS"].includes(name)
}
</script>
