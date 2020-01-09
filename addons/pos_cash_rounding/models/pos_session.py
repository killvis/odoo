# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields
from odoo.tools import float_is_zero, float_round, float_compare

class PosSession(models.Model):
    _inherit = "pos.session"

    def _get_rounding_difference_vals(self, amount, amount_converted):
        if self.config_id.cash_rounding:
            partial_args = {
                'name': 'Rounding line',
                'move_id': self.move_id.id,
            }
            if float_compare(0.0, amount, precision_rounding=self.currency_id.rounding) > 0:    # loss
                partial_args['account_id'] = self.config_id.rounding_method._get_loss_account_id().id
                return self._debit_amounts(partial_args, -amount, -amount_converted)

            if float_compare(0.0, amount, precision_rounding=self.currency_id.rounding) < 0:   # profit
                partial_args['account_id'] = self.config_id.rounding_method._get_profit_account_id().id
                return self._credit_amounts(partial_args, amount, amount_converted)

    def _get_extra_move_lines_vals(self):
        res = super(PosSession, self)._get_extra_move_lines_vals()
        if not self.config_id.cash_rounding:
            return res
        rounding_difference = {'amount': 0.0, 'amount_converted': 0.0}
        rounding_vals = []
        for order in self.order_ids:
            if not order.is_invoiced:
                diff = order.amount_paid - order.amount_total
                rounding_difference = self._update_amounts(rounding_difference, {'amount': diff}, order.date_order)
        if not float_is_zero(rounding_difference['amount'], precision_rounding=self.currency_id.rounding) or not float_is_zero(rounding_difference['amount_converted'], precision_rounding=self.currency_id.rounding):
            rounding_vals += [self._get_rounding_difference_vals(rounding_difference['amount'], rounding_difference['amount_converted'])]
        return res + rounding_vals
