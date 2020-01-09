# -*- coding: utf-8 -*-
from odoo import tests
from odoo.addons.account.tests.common import AccountTestCommon
from odoo.tools import mute_logger

@tests.tagged('post_install', '-at_install')
class TestSaleTransaction(AccountTestCommon):
    @classmethod
    def setUpClass(cls):
        super(TestSaleTransaction, cls).setUpClass()
        cls.product = cls.env['product.product'].create({
            'name': 'Product A',
        })
        cls.order = cls.env['sale.order'].create({
            'partner_id': cls.env['res.partner'].create({'name': 'A partner'}).id,
            'order_line': [
                (0, False, {
                    'product_id': cls.product.id,
                    'name': '1 Product',
                    'price_unit': 100.0,
                }),
            ],
        })
        cls.env.ref('payment.payment_acquirer_transfer').journal_id = cls.cash_journal
        if not cls.env.company.country_id:
            cls.env.company.country_id = cls.env.ref('base.us')

        cls.transaction = cls.order._create_payment_transaction({
            'acquirer_id': cls.env.ref('payment.payment_acquirer_transfer').id,
        })

    def test_sale_invoicing_from_transaction(self):
        ''' Test the following scenario:
        - Create a sale order
        - Create a transaction for the sale order.
        - Confirm the transaction but no invoice generated automatically.
        - Create manually an invoice for this sale order.
        => The invoice must be paid.
        '''
        taxes = self.order.order_line.tax_id.compute_all(
                    100.0, self.order.currency_id,
                    self.order.order_line.product_uom_qty, product=self.product, partner=self.order.partner_shipping_id)
        taxes = sum(t.get('amount', 0.0) for t in taxes.get('taxes', []))
        self.assertEqual(
            self.order.amount_total,
            sum(self.order.order_line.mapped('price_total')),
        )
        self.transaction._set_transaction_done()
        self.transaction._post_process_after_done()

        # Assert a posted payment has been generated at this point.
        self.assertTrue(self.transaction.payment_id)
        self.assertEqual(self.transaction.payment_id.state, 'posted')
        self.assertEqual(self.order, self.transaction.sale_order_ids)

        invoice = self.order._create_invoices()
        invoice.post()

        self.assertIn(invoice, self.transaction.invoice_ids)
        self.assertEqual(invoice.invoice_payment_state, 'paid')

    def test_sale_transaction_mismatch(self):
        """Test that a transaction for the incorrect amount does not validate the SO."""
        # modify order total
        self.order.order_line[0].price_unit = 200.0
        self.transaction._set_transaction_done()
        with mute_logger('odoo.addons.sale.models.payment'):
            self.transaction._post_process_after_done()
        self.assertEqual(self.order.state, 'draft', 'a transaction for an incorrect amount should not validate a quote')
