use swc_core::{
    ast::{CallExpr, Callee, Expr},
    common::comments::Comments,
    visit::{as_folder, noop_visit_mut_type, Fold, VisitMut, VisitMutWith},
};

#[cfg(test)]
mod tests;

pub fn pure_annotation<C>(comments: C) -> impl Fold + VisitMut
where
    C: Comments + Clone,
{
    as_folder(PureAnnotation {
        comments: Some(comments),
    })
}

struct PureAnnotation<C: Comments>
where
    C: Comments,
{
    comments: Option<C>,
}

impl<C> VisitMut for PureAnnotation<C>
where
    C: Comments,
{
    noop_visit_mut_type!();

    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        if let Callee::Expr(expr) = &call.callee {
            if let Expr::Call(call_expr) = &**expr {
                if let Callee::Expr(expr) = &call_expr.callee {
                    if let Expr::Ident(ident) = &**expr {
                        let id = ident.as_ref();
                        if id == "__mustAllOf" || id == "__mustOneOf" {
                            if let Some(comments) = &self.comments {
                                println!("add_pure_comment {}", id);
                                comments.add_pure_comment(call.span.lo);
                            }
                        }
                    }
                };
            }
        };

        call.visit_mut_children_with(self);
    }
}
