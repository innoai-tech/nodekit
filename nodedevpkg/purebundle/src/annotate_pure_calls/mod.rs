use swc_core::common::comments::Comments;
use swc_core::ecma::ast::{
    ArrayLit, AssignExpr, AssignProp, CallExpr, Expr, Ident, KeyValueProp, Pass, Pat, VarDeclarator,
};
use swc_core::ecma::visit::{noop_visit_mut_type, visit_mut_pass, VisitMut, VisitMutWith};

pub fn annotate_pure_calls<C>(comments: C) -> impl VisitMut + Pass
where
    C: Comments + Clone,
{
    visit_mut_pass(PureAnnotation {
        comments: Some(comments),
    })
}

struct PureAnnotation<C: Comments>
where
    C: Comments + Clone,
{
    comments: Option<C>,
}

impl<C> VisitMut for PureAnnotation<C>
where
    C: Comments + Clone,
{
    noop_visit_mut_type!();

    // x = pureCall()
    // a.x = pureCall()
    fn visit_mut_assign_expr(&mut self, expr: &mut AssignExpr) {
        if let Expr::Call(call_expr) = expr.right.unwrap_parens() {
            if let Some(comments) = &self.comments {
                comments.add_pure_comment(call_expr.span.lo);
            };
        }
        expr.visit_mut_children_with(self);
    }

    fn visit_mut_assign_prop(&mut self, expr: &mut AssignProp) {
        if let Expr::Call(call_expr) = expr.value.unwrap_parens() {
            if let Some(comments) = &self.comments {
                comments.add_pure_comment(call_expr.span.lo);
            };
        }
        expr.visit_mut_children_with(self);
    }

    fn visit_mut_array_lit(&mut self, expr: &mut ArrayLit) {
        for elem in &expr.elems {
            if let Some(elem) = &elem {
                if let Expr::Call(call_expr) = &elem.expr.unwrap_parens() {
                    if let Some(comments) = &self.comments {
                        comments.add_pure_comment(call_expr.span.lo);
                    };
                }
            }
        }
        expr.visit_mut_children_with(self);
    }

    fn visit_mut_key_value_prop(&mut self, expr: &mut KeyValueProp) {
        if let Expr::Call(call_expr) = expr.value.unwrap_parens() {
            if let Some(comments) = &self.comments {
                comments.add_pure_comment(call_expr.span.lo);
            };
        }
        expr.visit_mut_children_with(self);
    }

    fn visit_mut_var_declarator(&mut self, expr: &mut VarDeclarator) {
        if let Pat::Ident(ref mut ident) = expr.name {
            let mut folder = InitUsedVisit {
                ident: ident.id.clone(),
                used: false,
            };
            // visit child
            expr.init.visit_mut_children_with(&mut folder);

            if !folder.used {
                if let Some(init) = &expr.init {
                    if let Expr::Call(call_expr) = init.unwrap_parens() {
                        if let Some(comments) = &self.comments {
                            comments.add_pure_comment(call_expr.span.lo);
                        };
                    }
                }
            }
        }

        expr.visit_mut_children_with(self);
    }

    fn visit_mut_call_expr(&mut self, expr: &mut CallExpr) {
        for arg in &expr.args {
            if let Expr::Call(call_expr) = arg.expr.unwrap_parens() {
                if let Some(comments) = &self.comments {
                    comments.add_pure_comment(call_expr.span.lo);
                };
            }
        }
        expr.visit_mut_children_with(self);
    }
}

struct InitUsedVisit {
    ident: Ident,
    used: bool,
}

impl VisitMut for InitUsedVisit {
    noop_visit_mut_type!();

    fn visit_mut_ident(&mut self, ident: &mut Ident) {
        if ident.sym == self.ident.sym {
            if ident.ctxt == self.ident.ctxt {
                self.used = true
            }
        }
    }
}
