import React from 'react';

// React error boundaries catch rendering and lazy-module failures. API errors
// are still handled by their individual screens so drafts can be preserved.
export class AppErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){
    if(!this.state.failed)return this.props.children;
    return <main role="alert" className="mx-auto max-w-md p-6 text-[#181c20]">
      <h1 className="text-xl font-bold">This screen could not load</h1>
      <p className="my-3">Check your connection and reload the app. Saved records remain on the server; unsaved changes on this screen may be lost.</p>
      <button type="button" className="min-h-11 rounded-xl bg-[#154212] px-4 text-white" onClick={()=>window.location.reload()}>Reload app</button>
    </main>;
  }
}
