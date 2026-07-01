import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '5jdxcai4',
    dataset: 'production',
  },
  // A hosted Studio is already live at https://nnf-icon-library.sanity.studio.
  // This folder is the local/code copy — run `npm run dev` to edit locally, or
  // `npx sanity deploy` and pick a Studio hostname to publish your own copy.
})
