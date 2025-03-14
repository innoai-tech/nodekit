use swc_core::plugin::metadata::TransformPluginProgramMetadata;
use swc_core::{ecma::ast::Program, plugin::plugin_transform};

use self::annotate_pure_calls::*;
use self::ignore_side_imports::*;

mod annotate_pure_calls;
mod ignore_side_imports;

#[plugin_transform]
pub fn process_transform(program: Program, metadata: TransformPluginProgramMetadata) -> Program {
    program
        .apply(&mut ignore_side_imports())
        .apply(&mut annotate_pure_calls(metadata.comments.clone()))
}
