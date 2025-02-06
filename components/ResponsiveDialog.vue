<script setup lang="ts">
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'

const isMobile = useMediaQuery('(max-width: 768px)')

const props = defineProps<{
  open?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})
</script>

<template>
  <Dialog v-if="!isMobile" v-model:open="isOpen">
    <DialogTrigger v-if="$slots.trigger">
      <slot name="trigger" />
    </DialogTrigger>
    <DialogContent v-if="$slots.content || $slots.default">
      <DialogHeader v-if="$slots.header">
        <slot name="header" />
      </DialogHeader>
      <slot name="content">
        <slot />
      </slot>
      <DialogFooter v-if="$slots.footer">
        <slot name="footer" />
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Drawer v-else v-model:open="isOpen">
    <DrawerTrigger v-if="$slots.trigger">
      <slot name="trigger" />
    </DrawerTrigger>
    <DrawerContent v-if="$slots.content || $slots.default">
      <DrawerHeader v-if="$slots.header">
        <slot name="header" />
      </DrawerHeader>
      <slot name="content">
        <slot />
      </slot>
      <DrawerFooter v-if="$slots.footer">
        <slot name="footer" />
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
</template>
