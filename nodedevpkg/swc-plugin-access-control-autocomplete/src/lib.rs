use swc_core::{
    ast::Program, common::chain, plugin::metadata::TransformPluginProgramMetadata,
    plugin::plugin_transform, visit::FoldWith,
};

use self::pure_annotation::*;
use self::wrap_access_control::*;

mod pure_annotation;
mod wrap_access_control;

#[plugin_transform]
pub fn access_control_autocomplete(
    program: Program,
    data: TransformPluginProgramMetadata,
) -> Program {
    let config = serde_json::from_str::<Options>(
        &data
            .get_transform_plugin_config()
            .expect("failed to get plugin config for access control autocomplete"),
    )
    .expect("invalid access control autocomplete");

    program.fold_with(&mut chain!(
        wrap_access_control(config),
        pure_annotation(data.comments.clone())
    ))
}
