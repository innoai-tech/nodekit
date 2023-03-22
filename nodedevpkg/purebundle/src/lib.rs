use swc_core::{ecma::ast::Program, plugin::plugin_transform};
use swc_core::ecma::visit::FoldWith;
use swc_core::plugin::metadata::TransformPluginProgramMetadata;

use self::ignore_side_imports::*;
use self::annotate_pure_calls::*;

mod annotate_pure_calls;
mod ignore_side_imports;

#[plugin_transform]
pub fn process_transform(program: Program, metadata: TransformPluginProgramMetadata) -> Program {
    program
        .fold_with(&mut ignore_side_imports())
        .fold_with(&mut annotate_pure_calls(metadata.comments.clone()))
}