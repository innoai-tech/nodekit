use swc_core::{ecma::ast::Program, plugin::plugin_transform};
use swc_core::ecma::visit::FoldWith;
use swc_core::plugin::metadata::TransformPluginProgramMetadata;

use self::transform::*;

mod transform;

#[plugin_transform]
pub fn process_transform(program: Program, metadata: TransformPluginProgramMetadata) -> Program {
    program.fold_with(&mut annotate_pure_calls(metadata.comments.clone()))
}