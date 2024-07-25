use swc_core::ecma::visit::FoldWith;
use swc_core::plugin::metadata::TransformPluginProgramMetadata;
use swc_core::{ecma::ast::Program, plugin::plugin_transform};


mod vue_component_completer;

use self::vue_component_completer::*;

#[plugin_transform]
pub fn process_transform(program: Program, _metadata: TransformPluginProgramMetadata) -> Program {
    program
        .fold_with(&mut vue_component_completer())
}
