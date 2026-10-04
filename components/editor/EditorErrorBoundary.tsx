"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props={children:ReactNode;scope:string;resetKey?:string};
type State={error:Error|null};

export class EditorErrorBoundary extends Component<Props,State>{
  state:State={error:null};
  static getDerivedStateFromError(error:Error):State{return{error};}
  componentDidCatch(error:Error,info:ErrorInfo){console.error(`[CreatorMake] ${this.props.scope} failed`,error,info.componentStack);}
  componentDidUpdate(previous:Props){if(this.state.error&&previous.resetKey!==this.props.resetKey)this.setState({error:null});}
  render(){
    if(!this.state.error)return this.props.children;
    return <section className="editor-error-boundary" role="alert">
      <strong>{this.props.scope} could not be displayed.</strong>
      <p>{this.state.error.message||"An unexpected rendering error occurred."}</p>
      <button onClick={()=>this.setState({error:null})}>Try again</button>
    </section>;
  }
}
