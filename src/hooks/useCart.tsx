import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId);      
      let newCart;

      if (productInCart) {
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
        if(stock.amount >= productInCart.amount + 1) {
          newCart = cart.map(product => { 
            if(product.id === productId) {              
              return { ...product, amount: product.amount + 1 }
            }
            return product;
          });
        } else {
          throw new Error('Quantidade solicitada fora de estoque');
        }
      } else {
        const { data: product } = await api.get<Product>(`/products/${productId}`).catch(err => {          
          throw new Error('Erro na adição do produto');
        });  
        newCart = [...cart, {...product, amount: 1}];
      }
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId);   
      if(!productInCart) {        
        throw new Error('Produto não existe no carrinho')
      }
      const newCart = cart.filter(product => product.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productInCart = cart.find(product => product.id === productId); 

      if (!productInCart) {
        throw new Error('Erro na alteração de quantidade do produto');
      }   
      
      if(productInCart.amount + amount <= 1){
        return;
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      if(stock.amount >= amount) {
        const newCart = cart.map(product => { 
          if (product.id === productId) {              
            return { ...product, amount: amount }
          }
          return product;
        });
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        throw new Error('Quantidade solicitada fora de estoque');
      }
    } catch (err){
      toast.error(err.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
