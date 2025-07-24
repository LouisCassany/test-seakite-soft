<template>
  <div>
    <button ref="connectBtn" @click="requestPort()" class=" text-white font-bold py-2 px-4 rounded cursor-pointer"
      :disabled="serialPortStatus" :class="{
        'bg-gray-500': serialPortStatus,
        'bg-blue-500 hover:bg-blue-700': !serialPortStatus
      }">
      {{ serialPortStatus ? "Connected" : "Connect" }}
    </button>

    <Frame :frame-template="test" />
  </div>
</template>

<script lang="ts" setup>
import { SerialProcess } from "./serial"
import { DataSchemas } from "./frame"
import { onMounted, ref } from "vue"
import { encode_buffer } from "./buffer"
import Frame from "./components/Frame.vue"

const serialPortStatus = ref(false)

const test = ref<any[]>([])

onMounted(async () => {

  await DataSchemas.start()
  SerialProcess.getPorts()

  test.value = DataSchemas.getFrameTemplates()["0x75"].templates


  SerialProcess.onFrameReceived = (frame: Uint8Array) => {
    if (frame[1] === 0x01) {
      const payload = new TextDecoder().decode(frame.slice(4, -1))
      console.log(payload)
    }
    if (frame[1] === 0x75) {
      // console.log(convertToHexString(frame))
    }
  }

  SerialProcess.onConnect = (connected: boolean) => {
    serialPortStatus.value = connected
  }

  setTimeout(async () => {
    const frame_id = 0x55
    const buffer = encode_buffer({ frame_id: frame_id }, "0x75")
    await SerialProcess.write(buffer)
  }, 1000)

})

async function requestPort() {
  //@ts-ignore
  const port = await navigator.serial.requestPort();
  if (port) {
    await SerialProcess.openPort(port);
  } else {
    console.log("No port selected");
  }
}

function convertToHexString(frame: Uint8Array): string {
  return Array.from(frame).map(byte => byte.toString(16).padStart(2, '0')).map(byte => `0x${byte}`).join(' ');
}

</script>